import { log } from "../logger";
import { Palaute } from "./model";
import { config } from "../config";
import { SystemError } from "hassu-common/error";
import { projektiDatabase } from "./projektiDatabase";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sortBy } from "lodash";
import { migrateFromOldSchema } from "./palauteSchemaUpdate";

const feedbackTableName: string = config.feedbackTableName ?? "missing";

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

  async markFeedbackIsAnswered(oid: string, id: string, vastattu: boolean): Promise<void> {
    log.info("markFeedbackIsAnswered", { oid, id, vastattu });

    try {
      const params = new UpdateCommand({
        TableName: feedbackTableName,
        Key: {
          oid,
          id,
        },
        UpdateExpression: "SET #vastattu = :vastattuValue",
        ExpressionAttributeNames: {
          "#vastattu": "vastattu",
        },
        ExpressionAttributeValues: {
          ":vastattuValue": vastattu,
        },
      });
      log.info("markFeedbackIsAnswered", { params });
      await getDynamoDBDocumentClient().send(params);
    } catch (e) {
      handleAWSError("markFeedbackIsAnswered", e as Error);
    }
  }

  async listFeedback(oid: string): Promise<Palaute[] | undefined> {
    const kaikkiPalautteet: Palaute[] = [];
    try {
      let lastEvaluatedKey: Record<string, any> | undefined;
      do {
        const params = new QueryCommand({
          TableName: feedbackTableName,
          KeyConditionExpression: "#oid = :oid",
          ExpressionAttributeNames: {
            "#oid": "oid",
          },
          ExpressionAttributeValues: {
            ":oid": oid,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const data = await getDynamoDBDocumentClient().send(params);
        lastEvaluatedKey = data.LastEvaluatedKey;
        const palautteet = data.Items as Palaute[];
        kaikkiPalautteet.push(...palautteet.map(migrateFromOldSchema));
      } while (lastEvaluatedKey !== undefined);
    } catch (e) {
      handleAWSError("listFeedback", e as Error);
    }
    return sortBy(kaikkiPalautteet, ["vastaanotettu", "sukunimi", "etunimi"]);
  }
}

function handleAWSError(message: string, cause: Error) {
  log.error(cause);
  throw new SystemError("FeedbackDatabase", message);
}

export const feedbackDatabase = new FeedbackDatabase();
