// Contains code generated or recommended by Amazon Q
/**
 * Poistaa yhteydenottotapaEmail ja yhteydenottotapaPuhelin attribuutit Palaute-taulusta.
 * Nämä kentät liittyivät palautelomakkeen "Toivottu yhteydenottotapa" -checkboxeihin,
 * Kentät ovat tarpeettomia eikä koodi enää lue niitä.
 * version 0.42.0 tuotantoonviennin jälkeen luoduilla palautteilla näitä kenttiä ei ole koskaan ollut.
*/
import { ScanCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";

const migrate001: PagedMigrationRunPlan = async (options) => {
  const page = await ddb.send(
    new ScanCommand({
      TableName: options.tableName,
      ExclusiveStartKey: options.startKey,
      Limit: 25,
      ProjectionExpression: "#oid, #id",
      FilterExpression: "attribute_exists(#email) OR attribute_exists(#puhelin)",
      ExpressionAttributeNames: {
        "#oid": "oid",
        "#id": "id",
        "#email": "yhteydenottotapaEmail",
        "#puhelin": "yhteydenottotapaPuhelin",
      },
    })
  );

  const updateInput = (page.Items ?? []).map<UpdateCommandInput>((item) => ({
    TableName: options.tableName,
    Key: { oid: item.oid, id: item.id },
    UpdateExpression: "REMOVE #email, #puhelin",
    ExpressionAttributeNames: {
      "#email": "yhteydenottotapaEmail",
      "#puhelin": "yhteydenottotapaPuhelin",
    },
  }));

  return { updateInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate001;
