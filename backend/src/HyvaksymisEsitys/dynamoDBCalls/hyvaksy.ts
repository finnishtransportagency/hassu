import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../../util/dateUtil";
import { sendParamsToDynamoDB } from "./util";
import { JulkaistuHyvaksymisEsitys } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export default async function hyvaksyHyvaksymisEsitys(input: {
  oid: string;
  versio: number;
  julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys;
}): Promise<number> {
  const { oid, versio, julkaistuHyvaksymisEsitys } = input;
  const nextVersion = versio + 1;
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "SET " +
      "#versio = :versio, " +
      "#julkaistuHyvaksymisEsitys = :julkaistuHyvaksymisEsitys, " +
      "#muokattavaHyvaksymisEsitys.#tila = :hyvaksytty " +
      "#paivitetty = :paivitetty",
    ExpressionAttributeNames: {
      "#versio": "versio",
      "#julkaistuHyvaksymisEsitys": "julkaistuHyvaksymisEsitys",
      "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
      "#tila": "tila",
      "#paivitetty": "paivitetty",
    },
    ExpressionAttributeValues: {
      ":versio": nextVersion,
      ":julkaistuHyvaksymisEsitys": julkaistuHyvaksymisEsitys,
      ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      ":versioFromInput": versio,
      ":hyvaksytty": API.HyvaksymisTila.HYVAKSYTTY,
      ":odottaaHyvaksyntaa": API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
    },
    ConditionExpression:
      "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
      "(attribute_not_exists(#muokattavaHyvaksymisEsitys) OR #muokattavaHyvaksymisEsitys.#tila = :odottaaHyvaksyntaa)",
  });

  await sendParamsToDynamoDB(params);
  return nextVersion;
}
