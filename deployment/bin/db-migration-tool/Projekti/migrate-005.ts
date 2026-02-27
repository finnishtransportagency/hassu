import { PutCommandInput, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../ddb";
import { PagedMigrationRunPlan } from "../types";
import {
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  JatkoPaatos1VaiheJulkaisu,
  JatkoPaatos2VaiheJulkaisu,
} from "../../../../backend/src/database/model";
import { createJulkaisuSortKey } from "../../../../backend/src/database/julkaisuItemKeys";

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
          projektiOid: projekti.oid,
          sortKey: createJulkaisuSortKey("JULKAISU#HYVAKSYMISPAATOS#", value.id),
        })) ?? []
  );

  const jatko1Julkaisut = projektis.flatMap(
    (projekti) =>
      projekti.jatkoPaatos1VaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<JatkoPaatos1VaiheJulkaisu>((value) => ({
          ...value,
          projektiOid: projekti.oid,
          sortKey: createJulkaisuSortKey("JULKAISU#JATKOPAATOS1#", value.id),
        })) ?? []
  );

  const jatko2Julkaisut = projektis.flatMap(
    (projekti) =>
      projekti.jatkoPaatos2VaiheJulkaisut
        ?.filter((julkaisu) => !!julkaisu)
        ?.map<JatkoPaatos2VaiheJulkaisu>((value) => ({
          ...value,
          projektiOid: projekti.oid,
          sortKey: createJulkaisuSortKey("JULKAISU#JATKOPAATOS2#", value.id),
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
