import { PutCommandInput, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../../../../backend/src/database/model";

const migrate002: PagedMigrationRunPlan = async (options) => {
  const page = await ddb.send(
    new ScanCommand({
      TableName: options.tableName,
      ExclusiveStartKey: options.startKey,
      ProjectionExpression: "#oid, #julkaisut",
      FilterExpression: "attribute_exists(#julkaisut)",
      ExpressionAttributeNames: {
        "#oid": "oid",
        "#julkaisut": "nahtavillaoloVaiheJulkaisut",
      },
    })
  );

  const projektis = (page.Items ?? []) as Pick<DBProjekti, "oid" | "nahtavillaoloVaiheJulkaisut">[];

  const julkaisu = projektis.flatMap(
    (projekti) =>
      projekti.nahtavillaoloVaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<NahtavillaoloVaiheJulkaisu>((value) => ({ ...value, projektiOid: projekti.oid })) ?? []
  );

  const putInput = julkaisu.map((julkaisu) => {
    const input: PutCommandInput = {
      TableName: `NahtavillaoloVaiheJulkaisu-${options.migrateOptions.environment}`,
      ConditionExpression: "attribute_not_exists(#projektiOid) AND attribute_not_exists(#id)",
      Item: julkaisu,
      ExpressionAttributeNames: {
        "#projektiOid": "projektiOid",
        "#id": "id",
      },
    };
    return input;
  });

  return { putInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate002;
