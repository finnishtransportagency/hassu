import { log } from "../logger";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import { DBProjekti } from "../database/model";
import { projektiSearchService } from "./projektiSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../aws/monitoring";
import { MaintenanceEvent, ProjektiSearchMaintenanceService } from "./projektiSearchMaintenanceService";

import { getSQS } from "../aws/clients/getSQS";
import { parameters } from "../aws/parameters";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import { projektiDatabase } from "../database/projektiDatabase";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { chunkArray } from "../database/chunkArray";
import { uuid } from "hassu-common/util/uuid";

async function handleChange(record: DynamoDBRecord) {
  const oid = record.dynamodb?.Keys?.oid?.S ?? record.dynamodb?.Keys?.projektiOid?.S;
  const { eventName, eventSource, eventSourceARN } = record;
  const { Keys } = record.dynamodb ?? {};
  const logInfo = { eventName, eventSource, Keys, eventSourceARN };

  if (!oid) {
    log.error("No oid found for record", logInfo);
    return;
  }

  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!projekti) {
    log.info("No projekti found, remove from index", logInfo);
    await projektiSearchService.removeProjekti(oid);
  } else {
    log.info(`Update projekti to index`, logInfo);
    await projektiSearchService.indexProjekti(projekti);
  }
}

async function handleManagementAction(event: MaintenanceEvent) {
  log.info("handleManagementAction");
  const action = event.action;
  if (action == "deleteIndex") {
    await new ProjektiSearchMaintenanceService().deleteIndex();
  } else if (action == "index") {
    let startKey: string | undefined = undefined;
    const queueUrl = await parameters.getIndexerSQSUrl();
    do {
      const scanResult: {
        startKey: string | undefined;
        projektis: DBProjekti[];
      } = await projektiDatabase.scanProjektit(startKey);
      startKey = scanResult.startKey;
      const entries = scanResult.projektis.map<SendMessageBatchRequestEntry>((projekti) => ({
        Id: uuid.v4(),
        MessageBody: JSON.stringify({ action: "index", oid: projekti.oid }),
      }));
      for (const chunk of chunkArray(entries, 10)) {
        await getSQS().sendMessageBatch({ QueueUrl: queueUrl, Entries: chunk });
      }
    } while (startKey);
    log.info("Indeksointi aloitettu");
  }
}

type Event = DynamoDBStreamEvent | MaintenanceEvent | SQSEvent;

function eventIsMaintenanceEvent(event: Event): event is MaintenanceEvent {
  return !!(event as MaintenanceEvent).action;
}

function eventIsSqsEvent(event: Event): event is SQSEvent {
  const records = (event as SQSEvent).Records;
  return !!records.length && records.every((record) => record.body);
}

export const handleDynamoDBEvents = async (event: Event): Promise<void> => {
  if (eventIsMaintenanceEvent(event)) {
    await handleManagementAction(event);
  } else if (eventIsSqsEvent(event)) {
    await handleSqsEvent(event);
  } else {
    await handleStreamEvent(event);
  }
};

async function handleSqsEvent(event: SQSEvent) {
  log.info("handleSqsEvent");
  log.info("SQS records: " + event.Records.length);
  await Promise.all(
    event.Records.map(async (record) => {
      if (!record.body) {
        return;
      }
      const body: MaintenanceEvent = JSON.parse(record.body);
      log.info("Projektin oid " + body.oid);
      if (body.oid) {
        const dbProjekti = await projektiDatabase.loadProjektiByOid(body.oid);
        if (dbProjekti) {
          await projektiSearchService.indexProjekti(dbProjekti);
        }
      }
    })
  );
  log.info("Batchin indeksointi valmis");
}

function handleStreamEvent(event: DynamoDBStreamEvent) {
  log.info("handleStreamEvent");
  setupLambdaMonitoring();
  if (!event.Records) {
    log.warn("No records");
    return;
  }
  return wrapXRayAsync("handler", async (subsegment) => {
    return (async () => {
      setupLambdaMonitoringMetaData(subsegment);
      try {
        for (const record of event.Records) {
          await handleChange(record);
        }
      } catch (e: unknown) {
        log.error(e);
        throw e;
      }
    })();
  });
}
