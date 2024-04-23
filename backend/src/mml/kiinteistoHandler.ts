import { SQSEvent } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log, setLogContextOid } from "../logger";
import { MmlClient, getMmlClient } from "./mmlClient";
import { parameters } from "../aws/parameters";
import { getVaylaUser, identifyMockUser, requirePermissionMuokkaa } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  HaeKiinteistonOmistajatQueryVariables,
  KiinteistonOmistajat,
  Omistaja,
  OmistajahakuTila,
  Status,
  TallennaKiinteistonOmistajaResponse,
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

export type OmistajaHakuEvent = {
  oid: string;
  uid: string;
  kiinteistotunnukset: string[];
  status?: Status | null;
};

let mmlClient: MmlClient | undefined = undefined;

async function getClient() {
  if (mmlClient === undefined) {
    const endpoint = await parameters.getKtjBaseUrl();
    const apiKey = await parameters.getMmlApiKey();
    const ogcEndpoint = await parameters.getOgcBaseUrl();
    const ogcApiKey = await parameters.getOgcApiKey();
    mmlClient = getMmlClient({ endpoint, apiKey, ogcEndpoint, ogcApiKey });
  }
  return mmlClient;
}

function suomifiLahetys(omistaja: Pick<DBOmistaja, "henkilotunnus" | "ytunnus" | "jakeluosoite" | "paikkakunta" | "postinumero">): boolean {
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
  kiinteistotunnus: string;
  kayttooikeusyksikkotunnus?: string | null;
  etunimet?: string | null;
  sukunimi?: string | null;
  nimi?: string | null;
};

function mapKey({ kiinteistotunnus, kayttooikeusyksikkotunnus, etunimet, sukunimi, nimi }: MapKeyInfo) {
  return `${kiinteistotunnus}_${etunimet}_${sukunimi}_${nimi}${kayttooikeusyksikkotunnus ? "_" + kayttooikeusyksikkotunnus : ""}`;
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
        const kiinteistot = await client.haeLainhuutotiedot(hakuEvent.kiinteistotunnukset, hakuEvent.uid);
        const yhteystiedot = await client.haeYhteystiedot(hakuEvent.kiinteistotunnukset, hakuEvent.uid);
        const tiekunnat = await client.haeTiekunnat(hakuEvent.kiinteistotunnukset, hakuEvent.uid);
        const yhteisalueet = await client.haeYhteisalueet(hakuEvent.kiinteistotunnukset, hakuEvent.uid);
        log.info("Vastauksena saatiin " + kiinteistot.length + " kiinteistö(ä)");
        log.info("Vastauksena saatiin " + yhteystiedot.length + " yhteystieto(a)");
        log.info("Vastauksena saatiin " + tiekunnat.length + " tiekunta(a)");
        log.info("Vastauksena saatiin " + yhteisalueet.length + " yhteisalue(atta)");

        const aiemmatOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(hakuEvent.oid);
        const oldOmistajaMap = new Map<string, DBOmistaja>(
          aiemmatOmistajat.map<[string, DBOmistaja]>((aiempiOmistaja) => [mapKey(aiempiOmistaja), aiempiOmistaja])
        );
        const omistajaMap = new Map<string, DBOmistaja>();
        const lisatty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
        const expires = getExpires();
        yhteystiedot.push(...tiekunnat, ...yhteisalueet);
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
            omistajaMap.set(mapKey({ kiinteistotunnus: k.kiinteistotunnus, kayttooikeusyksikkotunnus: k.kayttooikeusyksikkotunnus, ...o }), omistaja);
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
        kiinteistot.forEach((k) => {
          k.omistajat.forEach((o) => {
            const key = mapKey({ kiinteistotunnus: k.kiinteistotunnus, ...o });
            const omistaja = omistajaMap.get(key);
            if (omistaja) {
              const taydennettyOmistaja: DBOmistaja = {
                ...omistaja,
                henkilotunnus: o.henkilotunnus,
                ytunnus: o.ytunnus,
              };
              taydennettyOmistaja.suomifiLahetys = suomifiLahetys(taydennettyOmistaja);
              omistajaMap.set(key, taydennettyOmistaja);
            } else {
              log.error(`Lainhuutotiedolle '${key}' ei löytynyt yhteystietoja`);
            }
          });
        });
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
            }
          });

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

export function setClient(client: MmlClient | undefined) {
  mmlClient = client;
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

export async function tallennaKiinteistonOmistajat(
  input: TallennaKiinteistonOmistajatMutationVariables
): Promise<TallennaKiinteistonOmistajaResponse> {
  const projekti = await getProjektiAndCheckPermissions(input.oid);
  const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
  const uudetOmistajat: DBOmistaja[] = [];
  const expires = getExpires();
  const initialOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(projekti.oid);
  const sailytettavatOmistajat = await haeSailytettavatKiinteistonOmistajat(projekti.oid, initialOmistajat, input.poistettavatOmistajat);
  const tallennettavatOmistajatInput = input.muutOmistajat.filter((omistaja) => {
    if (!omistaja.id || sailytettavatOmistajat.muutOmistajat.some((o) => o.id === omistaja.id)) {
      return true;
    }
    throw new IllegalArgumentError(`Tallennettava omistaja id:'${omistaja.id}' ei ole muutOmistajat listalla`);
  });
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
      uudetOmistajat.push(dbOmistaja);
    }
    dbOmistaja.jakeluosoite = omistaja.jakeluosoite;
    dbOmistaja.postinumero = omistaja.postinumero;
    dbOmistaja.paikkakunta = omistaja.paikkakunta;
    if (dbOmistaja.userCreated) {
      dbOmistaja.nimi = omistaja.nimi;
      dbOmistaja.kiinteistotunnus = omistaja.kiinteistotunnus;
    }
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getKiinteistonomistajaTableName(), Item: dbOmistaja }));
  }

  const mapToApi = (o: DBOmistaja): Omistaja => ({
    __typename: "Omistaja",
    id: o.id,
    oid: o.oid,
    kiinteistotunnus: o.kiinteistotunnus,
    lisatty: o.lisatty,
    paivitetty: o.paivitetty,
    etunimet: o.etunimet,
    sukunimi: o.sukunimi,
    nimi: o.nimi,
    jakeluosoite: o.jakeluosoite,
    paikkakunta: o.paikkakunta,
    postinumero: o.postinumero,
  });

  return {
    omistajat: sailytettavatOmistajat.omistajat.map(mapToApi),
    muutOmistajat: [...sailytettavatOmistajat.muutOmistajat, ...uudetOmistajat].map<Omistaja>(mapToApi),
    __typename: "TallennaKiinteistonOmistajaResponse",
  };
}

export async function haeSailytettavatKiinteistonOmistajat(
  oid: string,
  initialOmistajat: DBOmistaja[],
  poistettavatOmistajat: string[]
): Promise<{ omistajat: DBOmistaja[]; muutOmistajat: DBOmistaja[] }> {
  poistettavatOmistajat.forEach((poistettavaId) => {
    const idFound = initialOmistajat.some((omistaja) => omistaja.id === poistettavaId);
    if (!idFound) {
      throw new IllegalArgumentError(`Poistettavaa omistajaa id: '${poistettavaId}' ei löytynyt`);
    }
  });

  const { poistettavat, sailytettavat } = initialOmistajat.reduce<{
    poistettavat: DBOmistaja[];
    sailytettavat: DBOmistaja[];
  }>(
    (jaotellutOmistajat, omistaja) => {
      if (poistettavatOmistajat.includes(omistaja.id)) {
        jaotellutOmistajat.poistettavat.push(omistaja);
      } else {
        jaotellutOmistajat.sailytettavat.push(omistaja);
      }
      return jaotellutOmistajat;
    },
    { poistettavat: [], sailytettavat: [] }
  );

  await Promise.all(
    poistettavat.map(async (omistaja) => {
      auditLog.info("Poistetaan omistaja", { omistajaId: omistaja.id });
      await omistajaDatabase.poistaOmistajaKaytosta(oid, omistaja.id);
    })
  );

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
