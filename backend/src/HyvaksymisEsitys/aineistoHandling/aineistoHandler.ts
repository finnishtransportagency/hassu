import { SQSEvent, SQSHandler } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../../aws/monitoring";
import { log } from "../../logger";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { nyt, parseDate } from "../../util/dateUtil";
import { velho } from "../../velho/velhoClient";
import putFile from "../s3Calls/putFile";
import { adaptFileName, getYllapitoPathForProjekti, joinPath } from "../../tiedostot/paths";
import { HyvaksymisEsitysAineistoOperation, SqsEvent } from "./sqsEvent";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { config } from "../../config";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SimultaneousUpdateError } from "hassu-common/error";
import { DBEnnakkoNeuvotteluJulkaisu, DBProjekti, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { setZeroMessageVisibilityTimeout } from "./sqsClient";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../../tiedostot/zipFiles";
import collectHyvaksymisEsitysAineistot from "../collectHyvaksymisEsitysAineistot";
import { assertIsDefined } from "../../util/assertions";
import { ENNAKKONEUVOTTELU_PATH } from "../../ennakkoneuvottelu/tallenna";
import { Status } from "hassu-common/graphql/apiModel";
import GetProjektiStatus from "../../projekti/status/getProjektiStatus";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", async () => {
    for (const record of event.Records) {
      const receiptHandle = record.receiptHandle;
      const sentTimestamp = record.attributes.SentTimestamp;
      const timesInQueue = record.attributes.ApproximateReceiveCount;
      const sqsEvent: SqsEvent = JSON.parse(record.body);
      try {
        log.info("sqsEvent", sqsEvent);
        const { oid, operation } = sqsEvent;
        switch (operation) {
          case HyvaksymisEsitysAineistoOperation.TUO_HYV_ES_TIEDOSTOT: {
            await tuoAineistot(oid, false);
            break;
          }
          case HyvaksymisEsitysAineistoOperation.ZIP_HYV_ES_AINEISTOT: {
            await zipHyvEsAineistot(oid);
            break;
          }
          case HyvaksymisEsitysAineistoOperation.TUO_ENNAKKONEUVOTTELU_TIEDOSTOT: {
            await tuoAineistot(oid, true);
            break;
          }
          case HyvaksymisEsitysAineistoOperation.ZIP_ENNAKKONEUVOTTELU_TIEDOSTOT: {
            await zipHyvEsAineistot(oid, true);
            break;
          }
          default: {
            log.error(`Unknown event type: ${operation}`);
            break;
          }
        }
      } catch (e) {
        if (e instanceof SimultaneousUpdateError) {
          log.info(
            "SimultaneousUpdateError occured; setting visibility timeout to 0 and trowing error (event will be handled again right away), " +
              `if it has not been too long (RetentionPeriod) after message first appeared in queue (${sentTimestamp}). ` +
              `This was the ${timesInQueue}. time handling this event.`,
            sqsEvent
          );
          await setZeroMessageVisibilityTimeout(receiptHandle);
          throw e;
        } else {
          log.error(
            `Some error occured: "${(e as Error)?.message}". Trying again after visibilityTimeout has passed, ` +
              `if it has not been too long (RetentionPeriod) after message first appeared in queue (${sentTimestamp}). ` +
              `This was the ${timesInQueue}. time handling this event.`,
            sqsEvent
          );
          throw e;
        }
      }
    }
  });
};

export async function zipHyvEsAineistot(oid: string, ennakkoneuvottelu = false) {
  const projekti: ZipattavatAineistotHyvaksymisEsitykseen = await haeZipattavatAineistotHyvaksymisEsityksen(oid, ennakkoneuvottelu);
  let aineisto: DBEnnakkoNeuvotteluJulkaisu | MuokattavaHyvaksymisEsitys;
  if (ennakkoneuvottelu) {
    assertIsDefined(projekti.ennakkoNeuvotteluJulkaisu, "Ennakkoneuvottelun julkaisu oltava zipattaessa");
    aineisto = projekti.ennakkoNeuvotteluJulkaisu;
  } else {
    assertIsDefined(projekti.muokattavaHyvaksymisEsitys, "Muokattava hyväksymisesitys oltava zipattaessa");
    aineisto = projekti.muokattavaHyvaksymisEsitys;
  }
  const status: Status = await GetProjektiStatus.getProjektiStatus(projekti);
  const {
    hyvaksymisEsitys,
    kuulutuksetJaKutsu,
    muutAineistot,
    linkitetynProjektinAineisto,
    suunnitelma,
    kuntaMuistutukset,
    maanomistajaluettelo,
    lausunnot,
  } = collectHyvaksymisEsitysAineistot(projekti, aineisto, status, projekti.aineistoHandledAt);
  const filesToZip: ZipSourceFile[] = [
    ...hyvaksymisEsitys,
    ...kuulutuksetJaKutsu,
    ...muutAineistot,
    ...linkitetynProjektinAineisto,
    ...suunnitelma,
    ...kuntaMuistutukset,
    ...maanomistajaluettelo,
    ...lausunnot,
  ];
  await generateAndStreamZipfileToS3(
    config.yllapitoBucketName,
    filesToZip,
    joinPath(getYllapitoPathForProjekti(projekti.oid), ennakkoneuvottelu ? "ennakkoneuvottelu" : "hyvaksymisesitys", "/aineisto.zip")
  );
  await setAineistoZip(oid, ennakkoneuvottelu);
}

export async function tuoAineistot(oid: string, ennakko: boolean) {
  const projekti: HyvaksymisEsityksenAineistotiedot = await haeHyvaksymisEsityksenAineistotiedot(oid, ennakko);
  const { aineistoHandledAt, versio, lockedUntil, ennakkoNeuvottelu, muokattavaHyvaksymisEsitys } = projekti;
  const timestampNow = nyt().unix();
  if (lockedUntil && lockedUntil > timestampNow) {
    throw new SimultaneousUpdateError();
  }
  const aineistot = getHyvaksymisEsityksenAineistot(ennakkoNeuvottelu ?? muokattavaHyvaksymisEsitys);

  // Etsi käsittelemättömät aineistot aikaleimojen perusteella
  const uudetAineistot = aineistot.filter(
    (aineisto) => !aineistoHandledAt || parseDate(aineisto.lisatty).isAfter(parseDate(aineistoHandledAt))
  );
  if (!uudetAineistot.length) {
    log.info("Ei uusia aineistoja", "aineistoHandledAt viimeksi " + aineistoHandledAt);
  }
  // Tuo aineistot EI rinnakkaisesti (jostain syystä rinnakkain ajettuna Promise.all:in sisällä ei ikinä resolvaantunut tai rejectannut)
  await uudetAineistot
    .map((aineisto) => async () => {
      const { contents } = await velho.getAineisto(aineisto.dokumenttiOid);
      await putFile({
        targetPath: `yllapito/tiedostot/projekti/${oid}/${ennakko ? ENNAKKONEUVOTTELU_PATH : "muokattava_hyvaksymisesitys"}/${
          aineisto.avain
        }/${adaptFileName(aineisto.nimi)}`,
        filename: aineisto.nimi,
        contents,
      });
    })
    .reduce<Promise<void>>((prev, tuoAineisto) => prev.then(tuoAineisto), Promise.resolve());

  await setAineistoHandledAt(oid, versio);
}

type HyvaksymisEsityksenAineistotiedot = Pick<
  DBProjekti,
  "oid" | "versio" | "aineistoHandledAt" | "muokattavaHyvaksymisEsitys" | "lockedUntil" | "ennakkoNeuvottelu"
>;

async function haeHyvaksymisEsityksenAineistotiedot(oid: string, ennakkoneuvottelu: boolean): Promise<HyvaksymisEsityksenAineistotiedot> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression: `oid, versio, ${
      ennakkoneuvottelu ? "ennakkoNeuvottelu" : "muokattavaHyvaksymisEsitys"
    }, aineistoHandledAt, lockedUntil`,
  });

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    const data = await dynamoDBDocumentClient.send(params);
    if (!data.Item) {
      log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
      throw new Error();
    }
    const projekti = data.Item as HyvaksymisEsityksenAineistotiedot;
    return projekti;
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}

type ZipattavatAineistotHyvaksymisEsitykseen = Pick<
  DBProjekti,
  | "oid"
  | "versio"
  | "kielitiedot"
  | "aloitusKuulutusJulkaisut"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
  | "muokattavaHyvaksymisEsitys"
  | "aineistoHandledAt"
  | "velho"
  | "ennakkoNeuvotteluJulkaisu"
  | "kayttoOikeudet"
  | "euRahoitus"
  | "asianhallinta"
>;

async function haeZipattavatAineistotHyvaksymisEsityksen(
  oid: string,
  ennakkoneuvottelu: boolean
): Promise<ZipattavatAineistotHyvaksymisEsitykseen> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression:
      "oid, " +
      "versio, " +
      "kielitiedot, " +
      "aloitusKuulutusJulkaisut, " +
      "vuorovaikutusKierrosJulkaisut, " +
      "nahtavillaoloVaiheJulkaisut, " +
      "aineistoHandledAt, " +
      "velho, " +
      "kayttoOikeudet, " +
      "euRahoitus, " +
      "asianhallinta, " +
      (ennakkoneuvottelu ? "ennakkoNeuvotteluJulkaisu" : "muokattavaHyvaksymisEsitys"),
  });

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    const data = await dynamoDBDocumentClient.send(params);
    if (!data.Item) {
      log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
      throw new Error();
    }
    const projekti = data.Item as ZipattavatAineistotHyvaksymisEsitykseen;
    return projekti;
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}

async function setAineistoHandledAt(oid: string, versio: number) {
  const aineistoHandledAt = nyt().format();
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "SET " + "#aineistoHandledAt = :aineistoHandledAt",
    ExpressionAttributeNames: {
      "#aineistoHandledAt": "aineistoHandledAt",
      "#versio": "versio",
      "#lockedUntil": "lockedUntil",
    },
    ExpressionAttributeValues: {
      ":aineistoHandledAt": aineistoHandledAt,
      ":versioFromInput": versio,
      ":now": nyt().unix(),
      ":null": null,
    },
    ConditionExpression:
      "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
      `(attribute_not_exists(#lockedUntil) OR #lockedUntil = :null OR #lockedUntil < :now)`,
  });

  if (log.isLevelEnabled("debug")) {
    log.debug("Setting aineistoHandledAt", "aineistoHandledAt:" + aineistoHandledAt);
  }
  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    await dynamoDBDocumentClient.send(params);
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      throw new SimultaneousUpdateError();
    }
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}

async function setAineistoZip(oid: string, ennakkoneuvottelu: boolean) {
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "SET " + "#aineisto = :aineistoZip",
    ExpressionAttributeNames: {
      "#aineisto": ennakkoneuvottelu ? "ennakkoNeuvotteluAineistoPaketti" : "hyvEsAineistoPaketti",
    },
    ExpressionAttributeValues: {
      ":aineistoZip": ennakkoneuvottelu ? "ennakkoneuvottelu/aineisto.zip" : "hyvaksymisesitys/aineisto.zip",
    },
  });
  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    await dynamoDBDocumentClient.send(params);
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
