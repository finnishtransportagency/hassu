import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { sendUpdateCommandToDynamoDB } from "./util";
import { config } from "../../config";

export async function setLock(oid: string): Promise<void> {
  // TODO:
  const lockedUntil = "TODO";
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "SET " + "#lockedUntil = :lockedUntil",
    ExpressionAttributeNames: {
      "#lockedUntil": "lockedUntil",
    },
    ExpressionAttributeValues: {
      ":lockedUntil": lockedUntil,
    },
  });

  await sendUpdateCommandToDynamoDB(params);
}

export async function releaseLock(oid: string): Promise<void> {
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "SET " + "#lockedUntil = :lockedUntil",
    ExpressionAttributeNames: {
      "#lockedUntil": "lockedUntil",
    },
    ExpressionAttributeValues: {
      ":lockedUntil": null,
    },
  });

  await sendUpdateCommandToDynamoDB(params);
}
