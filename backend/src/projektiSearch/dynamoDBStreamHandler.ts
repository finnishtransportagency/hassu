import log from "loglevel";
import { DynamoDBStreamEvent } from "aws-lambda/trigger/dynamodb-stream";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { DBProjekti } from "../database/model/projekti";
import { projektiSearchService } from "./projektiSearchService";

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

const parse = DynamoDB.Converter.unmarshall;

export const handleDynamoDBEvents = async (event: DynamoDBStreamEvent) => {
  if (!event.Records) {
    log.warn("No records");
    return;
  }
  for (const record of event.Records) {
    switch (record.eventName) {
      case "INSERT":
      case "MODIFY":
        const projekti = parse(record.dynamodb.NewImage) as DBProjekti;
        log.info(record.eventName, projekti);
        await projektiSearchService.indexProjekti(projekti);
        break;
      case "REMOVE":
        const oid: string = record.dynamodb.Keys.oid.S;
        log.info("REMOVE ", oid);
        await projektiSearchService.removeProjekti(oid);
        break;
    }
  }
};
