import { log } from "../logger";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { DBProjekti } from "../database/model/projekti";
import { projektiSearchService } from "./projektiSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "../aws/monitoring";
import * as AWSXRay from "aws-xray-sdk-core";
import { MaintenanceEvent, ProjektiSearchMaintenanceService } from "./projektiSearchMaintenanceService";
import { invokeLambda } from "../aws/lambda";
import { Context } from "aws-lambda";

const parse = DynamoDB.Converter.unmarshall;

async function handleUpdate(record: DynamoDBRecord) {
  if (record.dynamodb?.NewImage) {
    const projekti = parse(record.dynamodb.NewImage) as DBProjekti;
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

async function handleManagementAction(action: "deleteIndex" | "index", event: MaintenanceEvent, context: Context) {
  if (action == "deleteIndex") {
    await new ProjektiSearchMaintenanceService().deleteIndex();
  } else if (action == "index") {
    const startKey = await new ProjektiSearchMaintenanceService().index(event);
    if (startKey && startKey !== event.startKey) {
      await invokeLambda(
        context.functionName,
        false,
        JSON.stringify({ action: "index", startKey } as MaintenanceEvent)
      );
    }
  }
}

export const handleDynamoDBEvents = async (
  event: DynamoDBStreamEvent | MaintenanceEvent,
  context: Context
): Promise<void> => {
  const action = (event as MaintenanceEvent).action;
  if (action) {
    return await handleManagementAction(action, event as MaintenanceEvent, context);
  }
  setupLambdaMonitoring();
  if (!(event as DynamoDBStreamEvent).Records) {
    log.warn("No records");
    return;
  }
  return await AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      return await (async () => {
        setupLambdaMonitoringMetaData(subsegment);
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
      })();
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
};
