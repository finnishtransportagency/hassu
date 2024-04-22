import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { log } from "../../logger";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { SimultaneousUpdateError } from "hassu-common/error";

export async function sendUpdateCommandToDynamoDB(params: UpdateCommand): Promise<void> {
  if (log.isLevelEnabled("debug")) {
    log.debug("Updating projekti to Hassu with params", { params });
  }
  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    await dynamoDBDocumentClient.send(params);
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
    }
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
