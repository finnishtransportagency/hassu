import { log } from "../logger";
import { DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { DBProjekti } from "../database/model/projekti";
import { projektiSearchService } from "./projektiSearchService";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "../aws/monitoring";
import * as AWSXRay from "aws-xray-sdk";

const parse = DynamoDB.Converter.unmarshall;

export const handleDynamoDBEvents = async (event: DynamoDBStreamEvent) => {
  setupLambdaMonitoring();
  if (!event.Records) {
    log.warn("No records");
    return;
  }
  return await AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      return await (async () => {
        setupLambdaMonitoringMetaData(subsegment);
        for (const record of event.Records) {
          switch (record.eventName) {
            case "INSERT":
            case "MODIFY":
              // @ts-ignore
              const projekti = parse(record.dynamodb.NewImage) as DBProjekti;
              log.info(record.eventName, { projekti });
              await projektiSearchService.indexProjekti(projekti);
              break;
            case "REMOVE":
              // @ts-ignore
              const oid: string = record.dynamodb.Keys.oid.S;
              log.info("REMOVE", { oid });
              await projektiSearchService.removeProjekti(oid);
              break;
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
