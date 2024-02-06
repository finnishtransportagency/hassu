import { SQSEvent } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log, setLogContextOid } from "../logger";
import { MmlClient, MmlKiinteisto, Omistaja as MmlOmistaja, getMmlClient } from "./mmlClient";
import { parameters } from "../aws/parameters";
import { getVaylaUser, identifyMockUser, requirePermissionMuokkaa } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { BatchGetCommand, BatchWriteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  HaeKiinteistonOmistajatQueryVariables,
  KiinteistonOmistajat,
  Omistaja,
  PoistaKiinteistonOmistajaMutationVariables,
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
import { getOmistajaTableName } from "../util/environment";

export type OmistajaHakuEvent = {
  oid: string;
  uid: string;
  kiinteistotunnukset: string[];
};

export type DBOmistaja = {
  id: string;
  oid: string;
  kiinteistotunnus: string;
  lisatty: string;
  paivitetty?: string | null;
  etunimet?: string | null;
  sukunimi?: string | null;
  nimi?: string | null;
  henkilotunnus?: string;
  ytunnus?: string;
  jakeluosoite?: string | null;
  postinumero?: string | null;
  paikkakunta?: string | null;
  maakoodi?: string | null;
  expires?: number;
  lahetykset?: [{ tila: "OK" | "VIRHE"; lahetysaika: string }];
};

let mmlClient: MmlClient | undefined = undefined;

async function getClient() {
  if (mmlClient === undefined) {
    const endpoint = await parameters.getKtjBaseUrl();
    const apiKey = await parameters.getMmlApiKey();
    mmlClient = getMmlClient({ endpoint, apiKey });
  }
  return mmlClient;
}

function* chunkArray<T>(arr: T[], stride = 1) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

function suomifiLahetys(omistaja: DBOmistaja): boolean {
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

function mapKey(k: MmlKiinteisto, o?: MmlOmistaja) {
  return `${k.kiinteistotunnus}_${o?.etunimet}_${o?.sukunimi}_${o?.nimi}`;
}

const handlerFactory = (event: SQSEvent) => async () => {
  try {
    const client = await getClient();
    for (const record of event.Records) {
      const hakuEvent: OmistajaHakuEvent = JSON.parse(record.body);
      setLogContextOid(hakuEvent.oid);
      identifyMockUser({ etunimi: "", sukunimi: "", uid: hakuEvent.uid, __typename: "NykyinenKayttaja" });
      auditLog.info("Haetaan kiinteistöjä", { kiinteistotunnukset: hakuEvent.kiinteistotunnukset });
      const kiinteistot = await client.haeLainhuutotiedot(hakuEvent.kiinteistotunnukset);
      const yhteystiedot = await client.haeYhteystiedot(hakuEvent.kiinteistotunnukset);
      log.info("Vastauksena saatiin " + kiinteistot.length + " kiinteistö(ä)");
      log.info("Vastauksena saatiin " + yhteystiedot.length + " yhteystieto(a)");
      const yhteystiedotMap = new Map<string, DBOmistaja>();
      const lisatty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
      const expires = getExpires();
      yhteystiedot.forEach((k) => {
        k.omistajat.forEach((o) => {
          yhteystiedotMap.set(mapKey(k, o), {
            id: uuid.v4(),
            kiinteistotunnus: k.kiinteistotunnus,
            oid: hakuEvent.oid,
            lisatty,
            etunimet: o.etunimet,
            sukunimi: o.sukunimi,
            nimi: o.nimi,
            jakeluosoite: o.yhteystiedot?.jakeluosoite,
            postinumero: o.yhteystiedot?.postinumero,
            paikkakunta: o.yhteystiedot?.paikkakunta,
            maakoodi: o.yhteystiedot?.maakoodi,
            expires,
          });
        });
        if (k.omistajat.length === 0) {
          yhteystiedotMap.set(mapKey(k), {
            id: uuid.v4(),
            kiinteistotunnus: k.kiinteistotunnus,
            oid: hakuEvent.oid,
            lisatty,
            expires,
          });
        }
      });
      kiinteistot.forEach((k) => {
        k.omistajat.forEach((o) => {
          const key = mapKey(k, o);
          const omistaja = yhteystiedotMap.get(key);
          if (omistaja) {
            yhteystiedotMap.set(key, { ...omistaja, henkilotunnus: o.henkilotunnus, ytunnus: o.ytunnus });
          } else {
            log.error(`Lainhuutotiedolle '${key}' ei löytynyt yhteystietoja`);
          }
        });
      });
      const dbOmistajat = [...yhteystiedotMap.values()];
      const omistajatChunks = chunkArray(dbOmistajat, 25);
      for (const chunk of omistajatChunks) {
        const putRequests = chunk.map((omistaja) => ({
          PutRequest: {
            Item: { ...omistaja },
          },
        }));
        log.info("Tallennetaan " + putRequests.length + " omistaja(a)");
        await getDynamoDBDocumentClient().send(
          new BatchWriteCommand({
            RequestItems: {
              [getOmistajaTableName()]: putRequests,
            },
          })
        );
      }
      dbOmistajat.forEach((o) => auditLog.info("Omistajan tiedot tallennettu", { omistajaId: o.id }));
      const omistajat = dbOmistajat.filter(suomifiLahetys).map((o) => o.id);
      const muutOmistajat = dbOmistajat.filter((o) => !suomifiLahetys(o)).map((o) => o.id);
      auditLog.info("Tallennetaan omistajat projektille", { omistajat, muutOmistajat });
      await projektiDatabase.setKiinteistonOmistajat(hakuEvent.oid, omistajat, muutOmistajat);
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
  getProjektiAndCheckPermissions(input.oid);
  await tallennaKarttarajaus(input.oid, input.geoJSON);
  const uid = getVaylaUser()?.uid as string;
  const event: OmistajaHakuEvent = { oid: input.oid, kiinteistotunnukset: input.kiinteistotunnukset, uid };
  await getSQS().sendMessage({ MessageBody: JSON.stringify(event), QueueUrl: await parameters.getKiinteistoSQSUrl() });
  auditLog.info("Omistajien haku event lisätty", { event });
}

export async function tallennaKiinteistonOmistajat(input: TallennaKiinteistonOmistajatMutationVariables): Promise<Omistaja[]> {
  const projekti = await getProjektiAndCheckPermissions(input.oid);
  const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
  const uudetOmistajat = [];
  const expires = getExpires();
  const omistajat: DBOmistaja[] = [];
  for (const omistaja of input.omistajat) {
    let dbOmistaja: DBOmistaja | undefined;
    if (omistaja.id) {
      const response = await getDynamoDBDocumentClient().send(new GetCommand({ TableName: getOmistajaTableName(), Key: { id: omistaja.id } }));
      dbOmistaja = response.Item as DBOmistaja;
      if (!dbOmistaja) {
        throw new Error("Omistajaa " + omistaja.id + " ei löydy");
      }
      dbOmistaja.paivitetty = now;
      dbOmistaja.etunimet = omistaja.etunimet;
      dbOmistaja.sukunimi = omistaja.sukunimi;
      dbOmistaja.nimi = omistaja.nimi;
      auditLog.info("Päivitetään omistajan tiedot", { omistajaId: dbOmistaja.id });
    } else {
      dbOmistaja = {
        id: uuid.v4(),
        kiinteistotunnus: omistaja.kiinteistotunnus,
        oid: input.oid,
        lisatty: now,
        etunimet: omistaja.etunimet,
        sukunimi: omistaja.sukunimi,
        nimi: omistaja.nimi,
        expires,
      };
      auditLog.info("Lisätään omistajan tiedot", { omistajaId: dbOmistaja.id });
      uudetOmistajat.push(dbOmistaja.id);
    }
    dbOmistaja.jakeluosoite = omistaja.jakeluosoite;
    dbOmistaja.postinumero = omistaja.postinumero;
    dbOmistaja.paikkakunta = omistaja.paikkakunta;
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getOmistajaTableName(), Item: dbOmistaja }));
    omistajat.push(dbOmistaja);
  }
  if (uudetOmistajat.length > 0) {
    const omistajat = projekti.omistajat ?? [];
    const muutOmistajat = projekti.muutOmistajat ?? [];
    await projektiDatabase.setKiinteistonOmistajat(projekti.oid, omistajat, [...muutOmistajat, ...uudetOmistajat]);
  }
  return omistajat.map((o) => {
    return {
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
    };
  });
}

export async function poistaKiinteistonOmistaja(input: PoistaKiinteistonOmistajaMutationVariables) {
  const projekti = await getProjektiAndCheckPermissions(input.oid);
  const omistajat = projekti.omistajat ?? [];
  const muutOmistajat = projekti.muutOmistajat ?? [];
  let idx = omistajat.indexOf(input.omistaja);
  if (idx !== -1) {
    omistajat.splice(idx, 1);
    auditLog.info("Poistetaan Suomi.fi omistaja", { omistajaId: input.omistaja });
  } else {
    idx = muutOmistajat.indexOf(input.omistaja);
    if (idx !== -1) {
      muutOmistajat.splice(idx, 1);
      auditLog.info("Poistetaan muu omistaja", { omistajaId: input.omistaja });
    } else {
      throw new Error("Kiinteistön omistajaa " + input.omistaja + " ei löydy");
    }
  }
  auditLog.info("Päivitetään omistajat projektille", { omistajat, muutOmistajat });
  projektiDatabase.setKiinteistonOmistajat(input.oid, omistajat, muutOmistajat);
}

export async function haeKiinteistonOmistajat(variables: HaeKiinteistonOmistajatQueryVariables): Promise<KiinteistonOmistajat> {
  const projekti = await getProjektiAndCheckPermissions(variables.oid);
  const sivuKoko = variables.sivuKoko ?? 10;
  const omistajat = variables.muutOmistajat ? projekti?.muutOmistajat ?? [] : projekti?.omistajat ?? [];
  const start = (variables.sivu - 1) * sivuKoko;
  const end = start + sivuKoko > omistajat.length ? undefined : start + sivuKoko;
  const ids = omistajat.slice(start, end);
  if (omistajat.length > 0 && ids.length > 0) {
    log.info("Haetaan kiinteistönomistajia", { tunnukset: ids });
    const command = new BatchGetCommand({
      RequestItems: {
        [getOmistajaTableName()]: {
          Keys: ids.map((key) => ({
            id: key,
          })),
        },
      },
    });
    const response = await getDynamoDBDocumentClient().send(command);
    const dbOmistajat = response.Responses ? (response.Responses[getOmistajaTableName()] as DBOmistaja[]) : [];
    dbOmistajat.forEach((o) => auditLog.info("Näytetään omistajan tiedot", { omistajaId: o.id }));
    return {
      __typename: "KiinteistonOmistajat",
      hakutulosMaara: omistajat.length,
      sivunKoko: sivuKoko,
      sivu: variables.sivu,
      omistajat: dbOmistajat.map((o) => ({
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
        postinumero: o.postinumero,
        paikkakunta: o.paikkakunta,
      })),
    };
  } else {
    return {
      __typename: "KiinteistonOmistajat",
      hakutulosMaara: omistajat.length,
      sivunKoko: sivuKoko,
      sivu: variables.sivu,
      omistajat: [],
    };
  }
}
