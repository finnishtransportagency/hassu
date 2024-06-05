import { log } from "../logger";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import { DBProjekti } from "../database/model";
import { projektiSearchService } from "./projektiSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../aws/monitoring";
import { MaintenanceEvent, ProjektiSearchMaintenanceService } from "./projektiSearchMaintenanceService";

import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { getSQS } from "../aws/clients/getSQS";
import { parameters } from "../aws/parameters";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import { projektiDatabase } from "../database/projektiDatabase";
import { SendMessageCommandInput } from "@aws-sdk/client-sqs";

async function handleUpdate(record: DynamoDBRecord) {
  if (record.dynamodb?.NewImage) {
    const projekti = unmarshall(record.dynamodb.NewImage as unknown as Record<string, AttributeValue>) as DBProjekti;
    log.info(`${record.eventName}`, { oid: projekti.oid });

    await projektiSearchService.indexProjekti(projekti);
  } else {
    log.error("No DynamoDB record to update");
  }
}

async function handleRemove(record: DynamoDBRecord) {
  if (record.dynamodb?.Keys?.oid.S) {
    const oid: string = record.dynamodb.Keys.oid.S;
    log.info("REMOVE", { oid });
    await projektiSearchService.removeProjekti(oid);
  } else {
    log.error("No DynamoDB key to remove");
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
      const scanResult = await projektiDatabase.scanProjektit(startKey);
      startKey = scanResult.startKey;
      const entries = scanResult.projektis.map<SendMessageCommandInput>((projekti) => ({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ action: "index", oid: projekti.oid }),
      }));
      for (const args of entries) {
        await getSQS().sendMessage(args);
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
    await handleSqsEvent(event)
  } else {
    await handleStreamEvent(event);
  }
}

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
          switch (record.eventName) {
            case "INSERT":
            case "MODIFY":
              await handleUpdate(record);
              break;
            case "REMOVE":
              await handleRemove(record);
          }
        }
      } catch (e: unknown) {
        log.error(e);
        throw e;
      }
    })();
  });
};
