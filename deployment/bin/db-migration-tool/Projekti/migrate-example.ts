import { QueryCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { nowWithOffset } from "../nowWithOffset";
import { PagedMigrationRunPlan } from "../types";

const migrate002: PagedMigrationRunPlan = async (options) => {
  const priorVersion = options.versionId - 1;

  const page = await ddb.send(
    new QueryCommand({
      TableName: options.tableName,
      IndexName: "SchemaVersionIndex",
      // KeyConditionExpression: "schemaVersion = :priorSv",
      // ExpressionAttributeValues: { ":priorSv": priorVersion },
      ProjectionExpression: "oid",
      ExclusiveStartKey: options.startKey,
    })
  );

  const updateInput: UpdateCommandInput[] = (page.Items ?? []).map((item) => ({
    TableName: options.tableName,
    Key: { oid: item.oid },
    ConditionExpression: "schemaVersion = :expected",
    UpdateExpression: `
                SET paivitetty = :now,
                    schemaVersion = :newVersion
              `,
    ExpressionAttributeValues: {
      ":expected": priorVersion,
      ":newVersion": options.versionId,
      ":now": nowWithOffset(),
    },
  }));
  return { updateInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate002;
