import { log } from "../logger";
import { Palaute } from "./model";
import { config } from "../config";
import { SystemError } from "../error/SystemError";
import { projektiDatabase } from "./projektiDatabase";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sortBy } from "lodash";

const feedbackTableName: string = config.feedbackTableName || "missing";

class FeedbackDatabase {
  async insertFeedback(palaute: Palaute): Promise<string | undefined> {
    log.info("insertFeedback", { palaute });

    try {
      const params = new PutCommand({
        TableName: feedbackTableName,
        Item: palaute,
      });
      await getDynamoDBDocumentClient().send(params);
      await projektiDatabase.setNewFeedbacksFlagOnProject(palaute.oid);

      return palaute.id;
    } catch (e) {
      handleAWSError("insertFeedback", e as Error);
    }
  }

  async markFeedbackIsBeingHandled(oid: string, id: string): Promise<void> {
    log.info("markFeedbackIsBeingHandled", { oid, id });

    try {
      const params = new UpdateCommand({
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
      });
      log.info("markFeedbackIsBeingHandled", { params });
      await getDynamoDBDocumentClient().send(params);
    } catch (e) {
      handleAWSError("markFeedbackIsBeingHandled", e as Error);
    }
  }

  async listFeedback(oid: string): Promise<Palaute[] | undefined> {
    try {
      const params = new QueryCommand({
        TableName: feedbackTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeNames: {
          "#oid": "oid",
        },
        ExpressionAttributeValues: {
          ":oid": oid,
        },
      });
      const data = await getDynamoDBDocumentClient().send(params);
      const palautteet = data.Items as Palaute[];
      return sortBy(palautteet, ["vastaanotettu", "sukunimi", "etunimi"]);
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
