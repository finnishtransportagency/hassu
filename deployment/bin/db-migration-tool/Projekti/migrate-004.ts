import { ScanCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";
import { DBProjekti } from "../../../../backend/src/database/model";

const migrate004: PagedMigrationRunPlan = async (options) => {
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

  const updateInput = projektis.map<UpdateCommandInput>((projekti) => ({
    TableName: options.tableName,
    Key: {
      oid: { S: projekti.oid },
    },
    UpdateExpression: "REMOVE #attr",
    ExpressionAttributeNames: {
      "#attr": "nahtavillaoloVaiheJulkaisut",
    },
  }));

  return { updateInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate004;
