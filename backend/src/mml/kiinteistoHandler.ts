import { SQSEvent } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log, setLogContextOid } from "../logger";
import { MmlClient, MmlKiinteisto, getMmlClient } from "./mmlClient";
import { parameters } from "../aws/parameters";
import { getVaylaUser, identifyMockUser, requirePermissionMuokkaa } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  HaeKiinteistonOmistajatQueryVariables,
  KiinteistonOmistajat,
  OmistajahakuTila,
  Status,
  TallennaKiinteistonOmistajatMutationVariables,
  TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables,
  TuoKarttarajausMutationVariables,
} from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { getSQS } from "../aws/clients/getSQS";
import { uuid } from "hassu-common/util/uuid";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { config } from "../config";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { IllegalArgumentError } from "hassu-common/error/IllegalArgumentError";
import { DBProjekti } from "../database/model";
import { getKiinteistonomistajaTableName } from "../util/environment";
import { DBOmistaja, omistajaDatabase } from "../database/omistajaDatabase";
import { omistajaSearchService } from "../projektiSearch/omistajaSearch/omistajaSearchService";
import { adaptOmistajahakuTila } from "../projekti/adapter/adaptToAPI/adaptOmistajahakuTila";
import { getPrhClient, PrhClient } from "./prh/prh";

export type OmistajaHakuEvent = {
  oid: string;
  uid: string;
  kiinteistotunnukset: string[];
  status?: Status | null;
};

let mmlClient: MmlClient | undefined = undefined;
let prhClient: PrhClient | undefined = undefined;

async function getClient() {
  if (mmlClient === undefined) {
    const endpoint = await parameters.getKtjBaseUrl();
    const apiKey = await parameters.getMmlApiKey();
    const ogcEndpoint = await parameters.getOgcBaseUrl();
    const ogcApiKey = await parameters.getOgcApiKey();
    const ogcApiExamples = await parameters.getOgcApiExmaples();
    mmlClient = getMmlClient({ endpoint, apiKey, ogcEndpoint, ogcApiKey, ogcApiExamples });
  }
  return mmlClient;
}

async function getClient2() {
  if (prhClient === undefined) {
    const conf = await parameters.getPrhConfig();
    prhClient = await getPrhClient({ endpoint: conf.endpoint, apiKey: conf.apikey, palveluTunnus: conf.palvelutunnus });
  }
  return prhClient;
}

function isSuomifiLahetys(
  omistaja: Pick<DBOmistaja, "henkilotunnus" | "ytunnus" | "jakeluosoite" | "paikkakunta" | "postinumero">
): boolean {
  return (!!omistaja.henkilotunnus || !!omistaja.ytunnus) && !!omistaja.jakeluosoite && !!omistaja.paikkakunta && !!omistaja.postinumero;
}

function getExpires() {
  // omistajien tiedot säilyvät seitsemän vuotta auditointilokia varten
  let days = 2557;
  if (!config.isPermanentEnvironment()) {
    days = 90;
  }
  return Math.round(Date.now() / 1000) + 60 * 60 * 24 * days;
}

type MapKeyInfo = {
  kiinteistotunnus?: string | null;
  kayttooikeusyksikkotunnus?: string | null;
  etunimet?: string | null;
  sukunimi?: string | null;
  nimi?: string | null;
};

function mapKey({ kiinteistotunnus, kayttooikeusyksikkotunnus, etunimet, sukunimi, nimi }: MapKeyInfo) {
  // Lainhuudossa yrityksen nimi saattaa olla kirjoitettu eri tavalla kuin yhteystiedoissa (esim. Raision Kaupunki vs. Raision kaupunki)
  return `${kiinteistotunnus}_${etunimet}_${sukunimi}_${nimi?.toLocaleLowerCase()}_${kayttooikeusyksikkotunnus}`;
}

const handlerFactory = (event: SQSEvent) => async () => {
  try {
    const client = await getClient();
    for (const record of event.Records) {
      const hakuEvent: OmistajaHakuEvent = JSON.parse(record.body);
      setLogContextOid(hakuEvent.oid);
      identifyMockUser({ etunimi: "", sukunimi: "", uid: hakuEvent.uid, __typename: "NykyinenKayttaja" });
      try {
        await projektiDatabase.setOmistajahakuTiedot(
          hakuEvent.oid,
          nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
          false,
          hakuEvent.kiinteistotunnukset.length
        );
        auditLog.info("Haetaan kiinteistöjä", { kiinteistotunnukset: hakuEvent.kiinteistotunnukset });
        const responses = await Promise.all([
          client.haeLainhuutotiedot(hakuEvent.kiinteistotunnukset, hakuEvent.uid),
          client.haeYhteystiedot(hakuEvent.kiinteistotunnukset, hakuEvent.uid),
          client.haeTiekunnat(hakuEvent.kiinteistotunnukset, hakuEvent.uid),
        ]);
        const kiinteistot = responses[0];
        const yhteystiedot = responses[1];
        const tiekunnat = responses[2];
        log.info("Vastauksena saatiin " + kiinteistot.length + " kiinteistö(ä)");
        log.info("Vastauksena saatiin " + yhteystiedot.length + " yhteystieto(a)");
        log.info("Vastauksena saatiin " + tiekunnat.length + " tiekunta(a)");
        updatePRHAddress(kiinteistot);
        const aiemmatOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(hakuEvent.oid);
        const oldOmistajaMap = new Map<string, DBOmistaja>(
          aiemmatOmistajat.map<[string, DBOmistaja]>((aiempiOmistaja) => [mapKey(aiempiOmistaja), aiempiOmistaja])
        );
        const omistajaMap = new Map<string, DBOmistaja>();
        // Lainhuutotiedot saattaa palauttaa omistajan tyttönimen kun taas yhteystiedoissa on oikea sukunimi
        // Jos kiinteistöllä ei ole muita omistajia samoilla etunimillä, niin lisätään hetu yhteystietoihin tästä mäpistä
        // Jos kiinteistöllä on monta omistajaa samoilla etunimillä niin silloin ei lisätä hetua yhteystietoihin
        const omistajaMapNoLastName = new Map<string, DBOmistaja>();
        let keys: string[] = [];
        const lisatty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
        const expires = getExpires();
        yhteystiedot.push(...tiekunnat);
        yhteystiedot.forEach((k) => {
          k.omistajat.forEach((o) => {
            const omistaja: DBOmistaja = {
              id: uuid.v4(),
              kiinteistotunnus: k.kiinteistotunnus,
              kayttooikeusyksikkotunnus: k.kayttooikeusyksikkotunnus,
              oid: hakuEvent.oid,
              lisatty,
              etunimet: o.etunimet,
              sukunimi: o.sukunimi,
              nimi: o.nimi,
              jakeluosoite: o.yhteystiedot?.jakeluosoite,
              postinumero: o.yhteystiedot?.postinumero,
              paikkakunta: o.yhteystiedot?.paikkakunta,
              maakoodi: o.yhteystiedot?.maakoodi,
              suomifiLahetys: false,
              kaytossa: true,
              expires,
            };
            omistajaMap.set(
              mapKey({ kiinteistotunnus: k.kiinteistotunnus, kayttooikeusyksikkotunnus: k.kayttooikeusyksikkotunnus, ...o }),
              omistaja
            );
            const key = mapKey({
              kiinteistotunnus: k.kiinteistotunnus,
              kayttooikeusyksikkotunnus: k.kayttooikeusyksikkotunnus,
              ...o,
              sukunimi: undefined,
            });
            if (keys.includes(key)) {
              omistajaMapNoLastName.delete(key);
            } else {
              keys.push(key);
              omistajaMapNoLastName.set(key, omistaja);
            }
          });
          if (k.omistajat.length === 0) {
            const omistaja: DBOmistaja = {
              id: uuid.v4(),
              kiinteistotunnus: k.kiinteistotunnus,
              oid: hakuEvent.oid,
              lisatty,
              expires,
              suomifiLahetys: false,
              kaytossa: true,
            };
            omistajaMap.set(mapKey(k), omistaja);
          }
        });
        keys = [];
        kiinteistot.forEach((k) => {
          k.omistajat.forEach((o) => {
            let key = mapKey({ kiinteistotunnus: k.kiinteistotunnus, ...o });
            let omistaja = omistajaMap.get(key);
            if (!omistaja) {
              omistaja = omistajaMapNoLastName.get(mapKey({ kiinteistotunnus: k.kiinteistotunnus, ...o, sukunimi: undefined }));
              if (omistaja) {
                key = mapKey({ ...omistaja });
              }
            }
            if (omistaja) {
              const taydennettyOmistaja: DBOmistaja = {
                ...omistaja,
                henkilotunnus: o.henkilotunnus,
                ytunnus: o.ytunnus,
              };
              // lisätään vain kerran sillä lainhuudoissa sama henkilö voi olla monta kertaa
              if (o.kuolinpvm && !taydennettyOmistaja.sukunimi?.endsWith(" (KP)")) {
                // KP = Kuolinpesä
                taydennettyOmistaja.sukunimi = (taydennettyOmistaja.sukunimi ?? "") + " (KP)";
              }
              // Täydennetään yrityksen osoitetiedot PRH rajapinnasta saatavilla osoitetiedoilla
              if (o.ytunnus && o.yhteystiedot) {
                taydennettyOmistaja.jakeluosoite = o.yhteystiedot.jakeluosoite;
                taydennettyOmistaja.postinumero = o.yhteystiedot.postinumero;
                taydennettyOmistaja.paikkakunta = o.yhteystiedot.paikkakunta;
                taydennettyOmistaja.maakoodi = o.yhteystiedot.maakoodi;
              }
              const suomifiLahetys = isSuomifiLahetys(taydennettyOmistaja);
              // Täydennetään Suomi.fi tiedotettaville maakoodi, jollei sitä jo ole
              // Tämä tehdään, jotta exceliin ja käyttöliittymälle saadaan aina näkymään maatieto Suomi.fi-tiedotettaville.
              // Muilla tavoilla tiedotettavilla maakoodi voi jäädä null / undefined:ksi
              if (suomifiLahetys) {
                taydennettyOmistaja.maakoodi = omistaja.maakoodi ?? "FI";
              }
              taydennettyOmistaja.suomifiLahetys = suomifiLahetys;
              omistajaMap.set(key, taydennettyOmistaja);
            } else {
              keys.push(key);
            }
          });
        });
        if (keys) {
          log.info("Lainhuutotiedolle ei löytynyt yhteystietoja", { keys });
        }
        const dbOmistajat = [...omistajaMap.values()];

        // Päivitä muille omistajille aiemmin tallennetut osoitetiedot
        dbOmistajat
          .filter((omistaja) => !omistaja.suomifiLahetys)
          .forEach((omistaja) => {
            const key = mapKey(omistaja);
            const oldOmistaja = oldOmistajaMap.get(key);
            if (oldOmistaja && !oldOmistaja.suomifiLahetys && !omistaja.paikkakunta && !omistaja.postinumero && !omistaja.jakeluosoite) {
              omistaja.jakeluosoite = oldOmistaja.jakeluosoite;
              omistaja.paikkakunta = oldOmistaja.paikkakunta;
              omistaja.postinumero = oldOmistaja.postinumero;
              omistaja.maakoodi = oldOmistaja.maakoodi;
            }
          });
        const oldUserCreated = [...oldOmistajaMap.values()].filter((o) => o.userCreated === true);
        dbOmistajat.push(...oldUserCreated);

        await omistajaDatabase.vaihdaProjektinKaytossaolevatOmistajat(hakuEvent.oid, dbOmistajat);

        dbOmistajat.forEach((o) => auditLog.info("Omistajan tiedot tallennettu", { omistajaId: o.id }));
        await projektiDatabase.setOmistajahakuTiedot(hakuEvent.oid, null, false, null, hakuEvent.status);
      } catch (e) {
        log.error("Kiinteistöjen haku epäonnistui projektilla: '" + hakuEvent.oid + "' " + e);
        await projektiDatabase.setOmistajahakuTiedot(hakuEvent.oid, null, true, null);
      }
    }
  } catch (e) {
    log.error("Kiinteistöjen haku epäonnistui: " + e);
    throw e;
  } finally {
    setLogContextOid(undefined);
    identifyMockUser(undefined);
  }
};

export function setClient(client: MmlClient | undefined, client2: PrhClient | undefined) {
  mmlClient = client;
  prhClient = client2;
}

export const handleEvent = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", handlerFactory(event));
};

export const tuoKarttarajaus = async ({ oid, geoJSON }: TuoKarttarajausMutationVariables) => {
  await getProjektiAndCheckPermissions(oid);
  await tallennaKarttarajaus(oid, geoJSON);
};

async function tallennaKarttarajaus(oid: string, geoJSON: string) {
  log.info("Tuodaan karttarajaus projektille", { oid });
  const fileLocation = "karttarajaus/karttarajaus.geojson";
  await fileService.createFileToProjekti({
    oid,
    fileName: fileLocation,
    path: new ProjektiPaths(oid),
    contents: Buffer.from(geoJSON, "utf-8"),
    contentType: "application/geo+json",
  });
  log.info("Karttarajaus tuotu projektille", { oid });
}

async function getProjektiAndCheckPermissions(oid: string): Promise<DBProjekti> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!projekti) {
    throw new IllegalArgumentError("Projektia ei löydy");
  }
  requirePermissionMuokkaa(projekti);
  return projekti;
}

export async function tuoKarttarajausJaTallennaKiinteistotunnukset(input: TuoKarttarajausJaTallennaKiinteistotunnuksetMutationVariables) {
  const projekti = await getProjektiAndCheckPermissions(input.oid);
  if (adaptOmistajahakuTila(projekti) === OmistajahakuTila.KAYNNISSA) {
    throw new Error("Omistajien haku on jo käynnissä");
  }
  await projektiDatabase.setOmistajahakuTiedot(
    input.oid,
    nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
    false,
    input.kiinteistotunnukset.length
  );
  await tallennaKarttarajaus(input.oid, input.geoJSON);
  const uid = getVaylaUser()?.uid as string;
  // testiympäristöissä Mikkeli (491) korvataan Testikunnalla (998) jotta saadaan testiaineisto.fi yhteystietoja
  let kiinteistotunnukset;
  if (!config.isProd()) {
    kiinteistotunnukset = input.kiinteistotunnukset.map((k) => {
      if (k.startsWith("491")) {
        return k.replace("491", "998");
      }
      return k;
    });
  } else {
    kiinteistotunnukset = input.kiinteistotunnukset;
  }
  const event: OmistajaHakuEvent = { oid: input.oid, kiinteistotunnukset, uid, status: input.status };
  await getSQS().sendMessage({ MessageBody: JSON.stringify(event), QueueUrl: await parameters.getKiinteistoSQSUrl() });
  auditLog.info("Omistajien haku event lisätty", { event });
}

export async function tallennaKiinteistonOmistajat(input: TallennaKiinteistonOmistajatMutationVariables): Promise<string[]> {
  const projekti = await getProjektiAndCheckPermissions(input.oid);
  const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
  const expires = getExpires();
  const initialOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(projekti.oid);
  await poistaKiinteistonOmistajat(projekti.oid, initialOmistajat, input.poistettavatOmistajat);
  const sailytettavatOmistajat = await haeSailytettavatKiinteistonOmistajat(initialOmistajat, input.poistettavatOmistajat);
  const tallennettavatOmistajatInput = input.muutOmistajat.filter((omistaja) => {
    if (!omistaja.id || sailytettavatOmistajat.muutOmistajat.some((o) => o.id === omistaja.id)) {
      return true;
    }
    throw new IllegalArgumentError(`Tallennettava omistaja id:'${omistaja.id}' ei ole muutOmistajat listalla`);
  });
  const ids = [];
  for (const omistaja of tallennettavatOmistajatInput) {
    let dbOmistaja: DBOmistaja | undefined;
    if (omistaja.id) {
      dbOmistaja = sailytettavatOmistajat.muutOmistajat.find((o) => o.id === omistaja.id);
      if (!dbOmistaja) {
        throw new Error("Omistajaa " + omistaja.id + " ei löydy");
      }
      dbOmistaja.paivitetty = now;
      auditLog.info("Päivitetään omistajan tiedot", { omistajaId: dbOmistaja.id });
    } else {
      dbOmistaja = {
        id: uuid.v4(),
        kiinteistotunnus: omistaja.kiinteistotunnus,
        oid: input.oid,
        lisatty: now,
        nimi: omistaja.nimi,
        suomifiLahetys: false,
        kaytossa: true,
        userCreated: true,
        expires,
      };
      auditLog.info("Lisätään omistajan tiedot", { omistajaId: dbOmistaja.id });
    }
    dbOmistaja.jakeluosoite = omistaja.jakeluosoite;
    dbOmistaja.postinumero = omistaja.postinumero;
    dbOmistaja.paikkakunta = omistaja.paikkakunta;
    dbOmistaja.maakoodi = omistaja.maakoodi;

    if (dbOmistaja.userCreated) {
      dbOmistaja.nimi = omistaja.nimi;
      dbOmistaja.kiinteistotunnus = omistaja.kiinteistotunnus;
      ids.push(dbOmistaja.id);
    }
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getKiinteistonomistajaTableName(), Item: dbOmistaja }));
  }
  return ids;
}

async function poistaKiinteistonOmistajat(oid: string, initialOmistajat: DBOmistaja[], poistettavatOmistajat: string[]) {
  poistettavatOmistajat.forEach((poistettavaId) => {
    const idFound = initialOmistajat.some((omistaja) => omistaja.id === poistettavaId);
    if (!idFound) {
      throw new IllegalArgumentError(`Poistettavaa omistajaa id: '${poistettavaId}' ei löytynyt`);
    }
  });
  await Promise.all(
    poistettavatOmistajat.map(async (id) => {
      auditLog.info("Poistetaan omistaja", { omistajaId: id });
      await omistajaDatabase.poistaOmistajaKaytosta(oid, id);
    })
  );
}

async function haeSailytettavatKiinteistonOmistajat(
  initialOmistajat: DBOmistaja[],
  poistettavatOmistajat: string[]
): Promise<{ omistajat: DBOmistaja[]; muutOmistajat: DBOmistaja[] }> {
  const sailytettavat = initialOmistajat.filter((omistaja) => !poistettavatOmistajat.includes(omistaja.id));

  return sailytettavat.reduce<{
    omistajat: DBOmistaja[];
    muutOmistajat: DBOmistaja[];
  }>(
    (jaotellutOmistajat, omistaja) => {
      if (omistaja.suomifiLahetys) {
        jaotellutOmistajat.omistajat.push(omistaja);
      } else {
        jaotellutOmistajat.muutOmistajat.push(omistaja);
      }
      return jaotellutOmistajat;
    },
    { omistajat: [], muutOmistajat: [] }
  );
}

export async function haeKiinteistonOmistajat(variables: HaeKiinteistonOmistajatQueryVariables): Promise<KiinteistonOmistajat> {
  await getProjektiAndCheckPermissions(variables.oid);
  log.info("Haetaan kiinteistönomistajatiedot", variables);
  const kiinteistonOmistajatResponse = await omistajaSearchService.searchOmistajat(variables);
  kiinteistonOmistajatResponse.omistajat.forEach((o) => auditLog.info("Näytetään omistajan tiedot", { omistajaId: o.id }));
  return kiinteistonOmistajatResponse;
}

async function updatePRHAddress(kiinteistot: MmlKiinteisto[]) {
  const client = await getClient2();
  const omistajat = kiinteistot.flatMap(k => k.omistajat).filter(o => o.ytunnus);
  const ytunnus = [...new Set(omistajat.map(o => o.ytunnus!)).values()];
  const resp = await client.haeYritykset(ytunnus);
  resp.response?.GetCompaniesResult?.Companies?.Company?.forEach(c => {
    omistajat.filter(o => o.ytunnus === c.BusinessId).forEach(o => {
      if (c.PostalAddress?.DomesticAddress?.PostalCodeActive) {
        o.nimi = c.TradeName?.Name ?? o.nimi;
        const street = [c.PostalAddress.DomesticAddress.Street, c.PostalAddress.DomesticAddress.BuildingNumber, c.PostalAddress.DomesticAddress.Entrance, c.PostalAddress.DomesticAddress.ApartmentNumber].filter(a => a).join(" ");
        o.yhteystiedot = {
          postinumero: c.PostalAddress.DomesticAddress.PostalCode,
          jakeluosoite: street,
          paikkakunta: c.PostalAddress.DomesticAddress.City,
          maakoodi: "FI",
        };
      } else if (c.PostalAddress?.ForeignAddress?.Country?.PrimaryCode) {
        o.nimi = c.TradeName?.Name ?? o.nimi;
        o.yhteystiedot = {
          postinumero: c.PostalAddress.ForeignAddress.AddressPart1,
          jakeluosoite: c.PostalAddress.ForeignAddress.AddressPart2,
          paikkakunta: c.PostalAddress.ForeignAddress.AddressPart3,
          maakoodi: c.PostalAddress.ForeignAddress.Country.PrimaryCode,
        };
      }
    });
  });
}
