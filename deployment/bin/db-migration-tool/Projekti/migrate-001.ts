import { BatchWriteCommand, QueryCommandOutput, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { nowWithOffset } from "../nowWithOffset";
import pLimit from "p-limit";

const limit = pLimit(10);

export default async function migrate001(tableName: string, schemaVersion: number): Promise<void> {
  let lastKey: QueryCommandOutput["LastEvaluatedKey"];

  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "oid, schemaVersion",
        FilterExpression: "attribute_not_exists(schemaVersion)",
        ExclusiveStartKey: lastKey,
      })
    );

    BatchWriteCommand;
    await Promise.all(
      (page.Items ?? []).map((item) =>
        limit(() =>
          ddb.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { oid: item.oid },
              UpdateExpression: `
                SET paivitetty = :now,
                    schemaVersion = :sv
              `,
              ExpressionAttributeValues: {
                ":now": nowWithOffset(),
                ":sv": schemaVersion,
              },
            })
          )
        )
      )
    );

    lastKey = page.LastEvaluatedKey;
  } while (lastKey);
}
