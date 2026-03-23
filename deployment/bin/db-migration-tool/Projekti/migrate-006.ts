import { ScanCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";
import { DBProjekti } from "../../../../backend/src/database/model";

const migrate006: PagedMigrationRunPlan = async (options) => {
  const page = await ddb.send(
    new ScanCommand({
      TableName: options.tableName,
      ExclusiveStartKey: options.startKey,
      ProjectionExpression: "#oid, #hyv, #jatko1, #jatko2",
      FilterExpression: "attribute_exists(#hyv) OR attribute_exists(#jatko1) OR attribute_exists(#jatko2)",
      ExpressionAttributeNames: {
        "#oid": "oid",
        "#hyv": "hyvaksymisPaatosVaiheJulkaisut",
        "#jatko1": "jatkoPaatos1VaiheJulkaisut",
        "#jatko2": "jatkoPaatos2VaiheJulkaisut",
      },
    })
  );

  const projektis = (page.Items ?? []) as Pick<
    DBProjekti,
    "oid" | "hyvaksymisPaatosVaiheJulkaisut" | "jatkoPaatos1VaiheJulkaisut" | "jatkoPaatos2VaiheJulkaisut"
  >[];

  const updateInput = projektis.map<UpdateCommandInput>((projekti) => ({
    TableName: options.tableName,
    Key: {
      oid: projekti.oid,
    },
    UpdateExpression: "REMOVE #hyv, #jatko1, #jatko2",
    ExpressionAttributeNames: {
      "#hyv": "hyvaksymisPaatosVaiheJulkaisut",
      "#jatko1": "jatkoPaatos1VaiheJulkaisut",
      "#jatko2": "jatkoPaatos2VaiheJulkaisut",
    },
  }));

  return { updateInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate006;
