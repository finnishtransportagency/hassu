import { log } from "../logger";
import { Palaute } from "./model";
import { config } from "../config";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { SystemError } from "../error/SystemError";
import { projektiDatabase } from "./projektiDatabase";
import { getDynamoDBDocumentClient } from "../aws/client";

const feedbackTableName: string = config.feedbackTableName || "missing";

class FeedbackDatabase {
  async insertFeedback(palaute: Palaute): Promise<string | undefined> {
    log.info("insertFeedback", { palaute });

    try {
      const params: DocumentClient.PutItemInput = {
        TableName: feedbackTableName,
        Item: palaute,
      };
      await getDynamoDBDocumentClient().put(params).promise();
      await projektiDatabase.saveProjekti({ oid: palaute.oid, uusiaPalautteita: 1 });

      return palaute.id;
    } catch (e) {
      handleAWSError("insertFeedback", e as Error);
    }
  }

  async markFeedbackIsBeingHandled(oid: string, id: string): Promise<void> {
    log.info("markFeedbackIsBeingHandled", { oid, id });

    try {
      const params: DocumentClient.UpdateItemInput = {
        TableName: feedbackTableName,
        Key: {
          oid,
          id,
        },
        UpdateExpression: "SET #otettuKasittelyyn = :true",
        ExpressionAttributeNames: {
          "#otettuKasittelyyn": "otettuKasittelyyn",
        },
        ExpressionAttributeValues: {
          ":true": true,
        },
      };
      log.info("markFeedbackIsBeingHandled", { params });
      await getDynamoDBDocumentClient().update(params).promise();
    } catch (e) {
      handleAWSError("markFeedbackIsBeingHandled", e as Error);
    }
  }

  async listFeedback(oid: string): Promise<Palaute[] | undefined> {
    log.info("listFeedback", { oid });

    try {
      const params: DocumentClient.QueryInput = {
        TableName: feedbackTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeNames: {
          "#oid": "oid",
        },
        ExpressionAttributeValues: {
          ":oid": oid,
        },
      };
      const data = await getDynamoDBDocumentClient().query(params).promise();
      return data.Items as Palaute[];
    } catch (e) {
      handleAWSError("listFeedback", e as Error);
    }
  }
}

function handleAWSError(message: string, cause: Error) {
  log.error(cause);
  throw new SystemError("FeedbackDatabase", message);
}

export const feedbackDatabase = new FeedbackDatabase();
