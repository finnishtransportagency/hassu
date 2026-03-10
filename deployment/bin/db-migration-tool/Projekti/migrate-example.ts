import { QueryCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";

/**
 * Paged plan for a database migration
 *
 * Reads database and determines which updates are needed.
 * You should not write update commands etc. that alters items in this file as migration tool should handle that logic.
 * @param options Contains options including ExclusiveStartKey for running scan or query commands
 * @returns UpdateCommandInputs for the migration tool to run (if not dryRun) and Scan or Query command's LastEvaluatedKey
 */
const migrateExample: PagedMigrationRunPlan = async (options) => {
  const page = await ddb.send(
    // Alternatively you could use ScanCommand
    // You could also add filter expression to select what items need to be updated
    new QueryCommand({
      TableName: options.tableName,
      ExclusiveStartKey: options.startKey,
    })
  );

  const updateInput = (page.Items ?? []).map<UpdateCommandInput>((item) => ({
    TableName: options.tableName,
    Key: { oid: item.oid },
    UpdateExpression: `
      SET #versio = if_not_exists(#versio, :zero) + :inc
    `,
    ExpressionAttributeNames: {
      "#versio": "versio",
    },
    ExpressionAttributeValues: {
      ":zero": 0,
      ":inc": 1,
    },
  }));

  return { updateInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrateExample;
