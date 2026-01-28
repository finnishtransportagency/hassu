import { ScanCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { nowWithOffset } from "../nowWithOffset";
import { PagedMigrationRunPlan } from "../types";

const migrate001: PagedMigrationRunPlan = async (options) => {
  const page = await ddb.send(
    new ScanCommand({
      TableName: options.tableName,
      ProjectionExpression: "oid, schemaVersion",
      FilterExpression: "attribute_not_exists(schemaVersion) and oid = :oid",
      ExpressionAttributeValues: {
        ":oid": "1.2.246.578.5.1.2966866411.3685097465",
      },
      ExclusiveStartKey: options.startKey,
    })
  );
  const updateInput: UpdateCommandInput[] = (page.Items ?? []).map((item) => ({
    TableName: options.tableName,
    Key: { oid: item.oid },
    UpdateExpression: `
                SET paivitetty = :now,
                    schemaVersion = :sv
              `,
    ExpressionAttributeValues: {
      ":now": nowWithOffset(),
      ":sv": options.versionId,
    },
    ConditionExpression: "attribute_not_exists(schemaVersion)",
  }));
  return { lastEvaluatedKey: page.LastEvaluatedKey, updateInput };
};

export default migrate001;
