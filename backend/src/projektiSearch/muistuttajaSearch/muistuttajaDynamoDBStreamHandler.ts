import { log } from "../../logger";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import { muistuttajaSearchService } from "./muistuttajaSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../../aws/monitoring";
import { MaintenanceEvent, MuistuttajaSearchMaintenanceService } from "./muistuttajaSearchMaintenanceService";

import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { getSQS } from "../../aws/clients/getSQS";
import { parameters } from "../../aws/parameters";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { chunkArray } from "../../database/chunkArray";
import { DBMuistuttaja, muistuttajaDatabase, MuistuttajaKey, MuistuttajaScanResult } from "../../database/muistuttajaDatabase";

async function handleUpdate(record: DynamoDBRecord) {
  if (record.dynamodb?.NewImage) {
    const muistuttaja = unmarshall(record.dynamodb.NewImage as unknown as Record<string, AttributeValue>) as DBMuistuttaja;
    log.info(`${record.eventName}`, { id: muistuttaja.id, oid: muistuttaja.oid });

    await muistuttajaSearchService.indexMuistuttaja(muistuttaja);
  } else {
    log.error("No DynamoDB record to update");
  }
}

async function handleRemove(record: DynamoDBRecord) {
  if (record.dynamodb?.Keys?.id.S) {
    const id: string = record.dynamodb.Keys.id.S;
    log.info("REMOVE", { id });
    await muistuttajaSearchService.removeMuistuttaja(id);
  } else {
    log.error("No DynamoDB key to remove");
  }
}

async function handleManagementEvent(event: MaintenanceEvent) {
  if (event.action === "deleteIndex") {
    await new MuistuttajaSearchMaintenanceService().deleteIndex();
  } else if (event.action === "index") {
    let startKey: MuistuttajaKey | undefined = undefined;
    const queueUrl = await parameters.getMuistuttajaIndexerSQSUrl();
    do {
      const scanResult: MuistuttajaScanResult = await muistuttajaDatabase.scanMuistuttajat(startKey);
      startKey = scanResult.startKey;
      const entries = scanResult.muistuttajat.map<SendMessageBatchRequestEntry>((muistuttaja) => ({
        Id: muistuttaja.id,
        MessageBody: JSON.stringify({ action: "index", muistuttaja }),
      }));
      for (const chunk of chunkArray(entries, 10)) {
        await getSQS().sendMessageBatch({ QueueUrl: queueUrl, Entries: chunk });
      }
    } while (startKey);
    log.info("Indeksointi aloitettu");
  }
}

type Event = DynamoDBStreamEvent | MaintenanceEvent | SQSEvent;

export const handleDynamoDBEvents = async (event: Event): Promise<void> => {
  if (eventIsMaintenanceEvent(event)) {
    await handleManagementEvent(event);
  } else if (eventIsSqsEvent(event)) {
    await handleSqsEvent(event);
  } else {
    await handleStreamEvent(event);
  }
};

function handleStreamEvent(event: DynamoDBStreamEvent) {
  setupLambdaMonitoring();
  if (!event.Records) {
    log.warn("No records");
    return;
  }
  return wrapXRayAsync("handler", async (subsegment) => {
    return (async () => {
      setupLambdaMonitoringMetaData(subsegment);
      try {
        const promises = event.Records.map(async (record) => {
          if (!record.eventName) {
            return;
          }
          if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
            await handleUpdate(record);
          } else if (record.eventName === "REMOVE") {
            await handleRemove(record);
          }
        });
        await Promise.all(promises);
      } catch (e: unknown) {
        log.error(e);
        throw e;
      }
    })();
  });
}

function eventIsMaintenanceEvent(event: DynamoDBStreamEvent | MaintenanceEvent | SQSEvent): event is MaintenanceEvent {
  return !!(event as MaintenanceEvent).action;
}

function eventIsSqsEvent(event: DynamoDBStreamEvent | MaintenanceEvent | SQSEvent): event is SQSEvent {
  const records = (event as SQSEvent).Records;
  return !!records.length && records.every((record) => record.body);
}

async function handleSqsEvent(event: SQSEvent) {
  log.info("SQS records: " + event.Records.length);
  await Promise.all(
    event.Records.map(async (record) => {
      if (!record.body) {
        return;
      }
      const body: MaintenanceEvent = JSON.parse(record.body);
      if (body.muistuttaja) {
        try {
          await muistuttajaSearchService.indexMuistuttaja(body.muistuttaja);
        } catch (e) {
          log.error(e);
        }
      }
    })
  );
  log.info("Batchin indeksointi valmis");
}
