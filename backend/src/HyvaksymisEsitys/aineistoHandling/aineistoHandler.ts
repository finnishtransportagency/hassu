import { SQSEvent, SQSHandler } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../../aws/monitoring";
import { log } from "../../logger";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { nyt, parseDate } from "../../util/dateUtil";
import { velho } from "../../velho/velhoClient";
import putFile from "../s3Calls/putFile";
import { adaptFileName } from "../../tiedostot/paths";
import { HyvaksymisEsitysAineistoOperation, SqsEvent } from "./sqsEvent";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { config } from "../../config";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SqsClient } from "./sqsClient";
import { SimultaneousUpdateError } from "hassu-common/error";
import { DBProjekti } from "../../database/model";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", async () => {
    for (const record of event.Records) {
      const sqsEvent: SqsEvent = JSON.parse(record.body);
      try {
        log.info("sqsEvent", sqsEvent);
        const { oid, operation } = sqsEvent;
        switch (operation) {
          case HyvaksymisEsitysAineistoOperation.TUO_HYV_ES_TIEDOSTOT: {
            await tuoAineistot(oid);
            break;
          }
          default: {
            log.error(`Unknown event type: ${operation}`);
            break;
          }
        }
      } catch (e) {
        if (e instanceof SimultaneousUpdateError) {
          log.info("SimultaneousUpdateError occured; returning event back to queue", sqsEvent);
          await SqsClient.addEventToSqsQueue(sqsEvent, false);
        } else {
          log.error(e);
          throw e;
        }
      }
    }
  });
};

async function tuoAineistot(oid: string) {
  const projekti: HyvaksymisEsityksenAineistotiedot = await haeHyvaksymisEsityksenAineistotiedot(oid);
  const { aineistoHandledAt, versio, lockedUntil } = projekti;
  const timestampNow = nyt().unix();
  if (lockedUntil && lockedUntil > timestampNow) {
    throw new SimultaneousUpdateError();
  }
  const aineistot = getHyvaksymisEsityksenAineistot(projekti.muokattavaHyvaksymisEsitys);

  // Etsi käsittelemättömät aineistot aikaleimojen perusteella
  const uudetAineistot = aineistot.filter(
    (aineisto) => !aineistoHandledAt || parseDate(aineisto.lisatty).isAfter(parseDate(aineistoHandledAt))
  );
  if (!uudetAineistot.length) {
    log.info("Ei uusia aineistoja", "aineistoHandledAt viimeksi " + aineistoHandledAt);
  }
  // Tuo aineistot
  await Promise.all(
    uudetAineistot.map(async (aineisto) => {
      const { contents } = await velho.getAineisto(aineisto.dokumenttiOid);
      await putFile({
        targetPath: `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${aineisto.avain}/${adaptFileName(aineisto.nimi)}`,
        filename: aineisto.nimi,
        contents,
      });
    })
  );

  await setAineistoHandledAt(oid, versio);
}

type HyvaksymisEsityksenAineistotiedot = Pick<
  DBProjekti,
  "oid" | "versio" | "aineistoHandledAt" | "muokattavaHyvaksymisEsitys" | "lockedUntil"
>;

async function haeHyvaksymisEsityksenAineistotiedot(oid: string): Promise<HyvaksymisEsityksenAineistotiedot> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression: "oid, versio, muokattavaHyvaksymiseistys, aineistoHandledAt, lockedUntil",
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
