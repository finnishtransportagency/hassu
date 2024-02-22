import { log } from "../../logger";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import { omistajaSearchService } from "./omistajaSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../../aws/monitoring";
import { MaintenanceEvent, OmistajaSearchMaintenanceService } from "./omistajaSearchMaintenanceService";

import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { getSQS } from "../../aws/clients/getSQS";
import { parameters } from "../../aws/parameters";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { chunkArray, DBOmistaja, omistajaDatabase, OmistajaKey, OmistajaScanResult } from "../../database/omistajaDatabase";

async function handleUpdate(record: DynamoDBRecord) {
  if (record.dynamodb?.NewImage) {
    const omistaja = unmarshall(record.dynamodb.NewImage as unknown as Record<string, AttributeValue>) as DBOmistaja;
    log.info(`${record.eventName}`, { id: omistaja.id, oid: omistaja.oid, kaytossa: omistaja.kaytossa });

    if (omistaja.kaytossa) {
      await omistajaSearchService.indexOmistaja(omistaja);
    } else {
      await omistajaSearchService.removeOmistaja(omistaja.id);
    }
  } else {
    log.error("No DynamoDB record to update");
  }
}

async function handleRemove(record: DynamoDBRecord) {
  if (record.dynamodb?.Keys?.id.S) {
    const id: string = record.dynamodb.Keys.id.S;
    log.info("REMOVE", { id });
    await omistajaSearchService.removeOmistaja(id);
  } else {
    log.error("No DynamoDB key to remove");
  }
}

async function handleManagementEvent(event: MaintenanceEvent) {
  if (event.action == "deleteIndex") {
    await new OmistajaSearchMaintenanceService().deleteIndex();
  } else if (event.action == "index") {
    let startKey: OmistajaKey | undefined = undefined;
    const queueUrl = await parameters.getOmistajaIndexerSQSUrl();
    do {
      const scanResult: OmistajaScanResult = await omistajaDatabase.scanOmistajat(startKey);
      startKey = scanResult.startKey;
      const entries = scanResult.omistajat.map<SendMessageBatchRequestEntry>((omistaja) => ({
        Id: omistaja.id,
        MessageBody: JSON.stringify({ action: "index", omistaja }),
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
    handleStreamEvent(event);
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
}

function eventIsMaintenanceEvent(event: DynamoDBStreamEvent | MaintenanceEvent | SQSEvent): event is MaintenanceEvent {
  return !!(event as MaintenanceEvent).action;
}

function eventIsSqsEvent(event: DynamoDBStreamEvent | MaintenanceEvent | SQSEvent): event is SQSEvent {
  const records = (event as SQSEvent).Records;
  return !!records.length && records.every((record) => record.body);
}

async function handleSqsEvent(event: SQSEvent) {
  await Promise.all(
    event.Records.map(async (record) => {
      if (!record.body) {
        return;
      }
      const body: MaintenanceEvent = JSON.parse(record.body);
      log.info("SQS event " + body.index + "/" + body.size + " received", { oid: body.omistaja?.oid });
      if (body.omistaja) {
        try {
          await omistajaSearchService.indexOmistaja(body.omistaja);
        } catch (e) {
          log.error(e);
        }
      }
      if (body.index === body.size) {
        log.info("Indeksointi valmis");
      }
    })
  );
}
