import { PutCommandInput, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";
import {
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  JatkoPaatos1VaiheJulkaisu,
  jatkopaatos1VaiheJulkaisuPrefix,
  JatkoPaatos2VaiheJulkaisu,
  jatkopaatos2VaiheJulkaisuPrefix,
} from "../../../../backend/src/database/model";

const migrate005: PagedMigrationRunPlan = async (options) => {
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

  const hyvaksymisJulkaisut = projektis.flatMap(
    (projekti) =>
      projekti.hyvaksymisPaatosVaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<HyvaksymisPaatosVaiheJulkaisu>((value) => ({
          ...value,
          sortKey: `${hyvaksymisPaatosVaiheJulkaisuPrefix}${value.id}`,
          projektiOid: projekti.oid,
        })) ?? []
  );

  const jatko1Julkaisut = projektis.flatMap(
    (projekti) =>
      projekti.jatkoPaatos1VaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<JatkoPaatos1VaiheJulkaisu>((value) => ({
          ...value,
          sortKey: `${jatkopaatos1VaiheJulkaisuPrefix}${value.id}`,
          projektiOid: projekti.oid,
        })) ?? []
  );

  const jatko2Julkaisut = projektis.flatMap(
    (projekti) =>
      projekti.jatkoPaatos2VaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<JatkoPaatos2VaiheJulkaisu>((value) => ({
          ...value,
          sortKey: `${jatkopaatos2VaiheJulkaisuPrefix}${value.id}`,
          projektiOid: projekti.oid,
        })) ?? []
  );

  const julkaisut = [...hyvaksymisJulkaisut, ...jatko1Julkaisut, ...jatko2Julkaisut];

  const putInput = julkaisut.map((julkaisu) => {
    const input: PutCommandInput = {
      TableName: `ProjektiData-${options.migrateOptions.environment}`,
      ConditionExpression: "attribute_not_exists(#projektiOid) AND attribute_not_exists(#sortKey)",
      Item: julkaisu,
      ExpressionAttributeNames: {
        "#projektiOid": "projektiOid",
        "#sortKey": "sortKey",
      },
    };
    return input;
  });

  return { putInput, lastEvaluatedKey: page.LastEvaluatedKey };
};

export default migrate005;
