import { SQSEvent, SQSHandler } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log, setLogContextOid } from "../logger";
import { MmlClient, getMmlClient } from "./mmlClient";
import { parameters } from "../aws/parameters";
import { getVaylaUser, identifyMockUser, requireVaylaUser } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { BatchGetCommand, BatchWriteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  HaeKiinteistonOmistajatQueryVariables,
  KiinteistonOmistajat,
  PoistaKiinteistonOmistajatMutationVariables,
  TallennaKiinteistonOmistajatMutationVariables,
  TallennaKiinteistotunnuksetMutationVariables,
} from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { getSQS } from "../aws/clients/getSQS";
import { uuid } from "hassu-common/util/uuid";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { config } from "../config";

export type OmistajaHakuEvent = {
  oid: string;
  uid: string;
  kiinteistotunnukset: string[];
};

type DBOmistaja = {
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
  yhteystiedot?: {
    jakeluosoite?: string | null;
    postinumero?: string | null;
    paikkakunta?: string | null;
  };
  expires?: number;
};

let mmlClient: MmlClient | undefined = undefined;

async function getClient() {
  if (mmlClient === undefined) {
    const endpoint = await parameters.getParameter("KtjBaseUrl");
    const apiKey = await parameters.getParameter("MmlApiKey");
    if (endpoint && apiKey) {
      mmlClient = getMmlClient({ endpoint, apiKey });
    } else {
      throw new Error("Parametria KtjBaseUrl tai MmlApiKey ei löydy");
    }
  }
  return mmlClient;
}

function* chunkArray<T>(arr: T[], stride = 1) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

function getTableName() {
  if (process.env.TABLE_OMISTAJA) {
    return process.env.TABLE_OMISTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_OMISTAJA ei löydy");
}

function suomifiLahetys(omistaja: DBOmistaja): boolean {
  return (
    (!!omistaja.henkilotunnus || !!omistaja.ytunnus) &&
    !!omistaja.yhteystiedot?.jakeluosoite &&
    !!omistaja.yhteystiedot.paikkakunta &&
    !!omistaja.yhteystiedot.postinumero
  );
}

function getExpires() {
  // omistajien tiedot säilyvät seitsemän vuotta auditointilokia varten
  let days = 2557;
  if (!config.isPermanentEnvironment()) {
    days = 90;
  }
  return Math.round(Date.now() / 1000) + 60 * 60 * 24 * days;
}

export const handlerFactory = (event: SQSEvent, mmlClient?: MmlClient) => async () => {
  try {
    const client = mmlClient ? mmlClient : await getClient();
    for (const record of event.Records) {
      const hakuEvent: OmistajaHakuEvent = JSON.parse(record.body);
      setLogContextOid(hakuEvent.oid);
      identifyMockUser({ etunimi: "", sukunimi: "", uid: hakuEvent.uid, __typename: "NykyinenKayttaja" });
      auditLog.info("Haetaan kiinteistöjä", { kiinteistotunnukset: hakuEvent.kiinteistotunnukset });
      const kiinteistot = await client.haeLainhuutotiedot(hakuEvent.kiinteistotunnukset);
      log.info("Vastauksena saatiin " + kiinteistot.length + " kiinteistö(ä)");
      const dbOmistajat: DBOmistaja[] = [];
      const lisatty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
      const expires = getExpires();
      kiinteistot.forEach((k) => {
        k.omistajat.forEach((o) => {
          dbOmistajat.push({
            id: uuid.v4(),
            kiinteistotunnus: k.kiinteistotunnus,
            oid: hakuEvent.oid,
            lisatty,
            henkilotunnus: o.henkilotunnus,
            ytunnus: o.ytunnus,
            etunimet: o.etunimet,
            sukunimi: o.sukunimi,
            nimi: o.nimi,
            yhteystiedot: {
              jakeluosoite: o.yhteystiedot?.jakeluosoite,
              postinumero: o.yhteystiedot?.postinumero,
              paikkakunta: o.yhteystiedot?.paikkakunta,
            },
            expires,
          });
        });
      });
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
              [getTableName()]: putRequests,
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

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", handlerFactory(event));
};

export async function tallennaKiinteistotunnukset(input: TallennaKiinteistotunnuksetMutationVariables) {
  requireVaylaUser();
  const uid = getVaylaUser()?.uid as string;
  const event: OmistajaHakuEvent = { oid: input.oid, kiinteistotunnukset: input.kiinteistotunnukset, uid };
  await getSQS().sendMessage({ MessageBody: JSON.stringify(event), QueueUrl: await parameters.getKiinteistoSQSUrl() });
  auditLog.info("Omistajien haku event lisätty", { event });
}

export async function tallennaKiinteistonOmistajat(input: TallennaKiinteistonOmistajatMutationVariables) {
  requireVaylaUser();
  const projekti = await projektiDatabase.loadProjektiByOid(input.oid);
  if (!projekti) {
    throw new Error("Projektia ei löydy");
  }
  const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
  for (const omistaja of input.omistajat) {
    let dbOmistaja: DBOmistaja | undefined;
    if (omistaja.id) {
      const response = await getDynamoDBDocumentClient().send(new GetCommand({ TableName: getTableName(), Key: { id: omistaja.id } }));
      dbOmistaja = response.Item as DBOmistaja;
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
        etunimet: omistaja.etunimet,
        sukunimi: omistaja.sukunimi,
        nimi: omistaja.nimi,
      };
      auditLog.info("Lisätään omistajan tiedot", { omistajaId: dbOmistaja.id });
    }
    dbOmistaja.yhteystiedot = {
      jakeluosoite: omistaja.yhteystiedot?.jakeluosoite,
      postinumero: omistaja.yhteystiedot?.postinumero,
      paikkakunta: omistaja.yhteystiedot?.paikkakunta,
    };
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getTableName(), Item: dbOmistaja }));
  }
}

export async function poistaKiinteistonOmistajat(input: PoistaKiinteistonOmistajatMutationVariables) {
  requireVaylaUser();
  const projekti = await projektiDatabase.loadProjektiByOid(input.oid);
  const omistajat = projekti?.omistajat ?? [];
  const muutOmistajat = projekti?.muutOmistajat ?? [];
  for (const id of input.omistajat) {
    let idx = omistajat.indexOf(id);
    if (idx !== -1) {
      omistajat.splice(idx, 1);
      auditLog.info("Poistetaan Suomi.fi omistaja", { omistajaId: id });
    } else {
      idx = muutOmistajat.indexOf(id);
      if (idx !== -1) {
        muutOmistajat.splice(idx, 1);
        auditLog.info("Poistetaan muu omistaja", { omistajaId: id });
      }
    }
  }
  auditLog.info("Päivitetään omistajat projektille", { omistajat, muutOmistajat });
  projektiDatabase.setKiinteistonOmistajat(input.oid, omistajat, muutOmistajat);
}

export async function haeKiinteistonOmistajat(variables: HaeKiinteistonOmistajatQueryVariables): Promise<KiinteistonOmistajat> {
  requireVaylaUser();
  const projekti = await projektiDatabase.loadProjektiByOid(variables.oid);
  const sivuKoko = variables.sivuKoko ?? 10;
  const omistajat = variables.muutOmistajat ? projekti?.muutOmistajat ?? [] : projekti?.omistajat ?? [];
  const start = (variables.sivu - 1) * sivuKoko;
  const end = start + sivuKoko > omistajat.length ? undefined : start + sivuKoko;
  const ids = omistajat.slice(start, end);
  if (omistajat.length > 0 && ids.length > 0) {
    log.info("Haetaan kiinteistönomistajia", { tunnukset: ids });
    const command = new BatchGetCommand({
      RequestItems: {
        [getTableName()]: {
          Keys: ids.map((key) => ({
            id: key,
          })),
        },
      },
    });
    const response = await getDynamoDBDocumentClient().send(command);
    const dbOmistajat = response.Responses ? (response.Responses[getTableName()] as DBOmistaja[]) : [];
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
        yhteystiedot: {
          __typename: "MmlYhteystieto",
          jakeluosoite: o.yhteystiedot?.jakeluosoite,
          postinumero: o.yhteystiedot?.postinumero,
          paikkakunta: o.yhteystiedot?.paikkakunta,
        },
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
