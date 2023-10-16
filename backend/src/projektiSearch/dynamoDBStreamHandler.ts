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
  const action = event.action;
  if (action == "deleteIndex") {
    await new ProjektiSearchMaintenanceService().deleteIndex();
  } else if (action == "index") {
    let startKey: string | undefined = undefined;
    const events: MaintenanceEvent[] = [];
    do {
      const scanResult = await projektiDatabase.scanProjektit(startKey);
      startKey = scanResult.startKey;
      for (const projekti of scanResult.projektis) {
        events.push({ action: "index", projekti })
      }
    } while (startKey);
    let i = 1;
    for (event of events) {
      event.index = i++;
      event.size = events.length;
      const args: SendMessageCommandInput = {
        QueueUrl: await parameters.getIndexerSQSUrl(),
        MessageBody: JSON.stringify(event)
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
    log.info("SQS event " + body.index + "/" + body.size + " received", { oid: body.projekti?.oid });
    if (body.projekti) {
      try {
        await projektiSearchService.indexProjekti(body.projekti);
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
