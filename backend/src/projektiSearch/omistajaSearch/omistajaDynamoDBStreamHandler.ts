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
import { SendMessageCommandInput } from "@aws-sdk/client-sqs";
import { DBOmistaja, omistajaDatabase, OmistajaKey, OmistajaScanResult } from "../../database/omistajaDatabase";

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

async function handleManagementAction(event: MaintenanceEvent) {
  const action = event.action;
  if (action == "deleteIndex") {
    await new OmistajaSearchMaintenanceService().deleteIndex();
  } else if (action == "index") {
    let startKey: OmistajaKey | undefined = undefined;
    const events: MaintenanceEvent[] = [];
    do {
      const scanResult: OmistajaScanResult = await omistajaDatabase.scanOmistajat(startKey);
      startKey = scanResult.startKey;
      for (const omistaja of scanResult.omistajat) {
        events.push({ action: "index", omistaja });
      }
    } while (startKey);
    let i = 1;
    for (event of events) {
      event.index = i++;
      event.size = events.length;
      const args: SendMessageCommandInput = {
        QueueUrl: await parameters.getIndexerSQSUrl(),
        MessageBody: JSON.stringify(event),
      };
      log.info("Sending SQS event " + event.index);
      await getSQS().sendMessage(args);
    }
    log.info("Indeksointi aloitettu");
  }
}

export const handleDynamoDBEvents = async (event: DynamoDBStreamEvent | MaintenanceEvent | SQSEvent): Promise<void> => {
  const action = (event as MaintenanceEvent).action;
  if (action) {
    return handleManagementAction(event as MaintenanceEvent);
  }
  const records = (event as SQSEvent).Records;
  if (records && records.length == 1 && records[0].body) {
    const body: MaintenanceEvent = JSON.parse(records[0].body);
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
    return;
  }
  setupLambdaMonitoring();
  if (!(event as DynamoDBStreamEvent).Records) {
    log.warn("No records");
    return;
  }
  return wrapXRayAsync("handler", async (subsegment) => {
    return (async () => {
      setupLambdaMonitoringMetaData(subsegment);
      try {
        for (const record of (event as DynamoDBStreamEvent).Records) {
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
