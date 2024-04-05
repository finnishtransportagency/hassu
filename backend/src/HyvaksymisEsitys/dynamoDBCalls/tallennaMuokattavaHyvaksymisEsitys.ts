import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../../util/dateUtil";
import { sendParamsToDynamoDB } from "./util";
import { MuokattavaHyvaksymisEsitys } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export default async function tallennaMuokattavaHyvaksymisEsitys(input: {
  oid: string;
  versio: number;
  muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys;
}): Promise<number> {
  const { oid, versio, muokattavaHyvaksymisEsitys } = input;
  const nextVersion = versio + 1;
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "SET " + "#versio = :versio, " + "#muokattavaHyvaksymisEsitys = :muokattavaHyvaksymisEsitys, " + "#paivitetty = :paivitetty",
    ExpressionAttributeNames: {
      "#versio": "versio",
      "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
      "#paivitetty": "paivitetty",
      "#tila": "tila",
    },
    ExpressionAttributeValues: {
      ":versio": nextVersion,
      ":muokattavaHyvaksymisEsitys": muokattavaHyvaksymisEsitys,
      ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      ":versioFromInput": versio,
      ":muokkaus": API.HyvaksymisTila.MUOKKAUS,
    },
    ConditionExpression:
      "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
      "(attribute_not_exists(#muokattavaHyvaksymisEsitys) OR #muokattavaHyvaksymisEsitys.#tila = :muokkaus)",
  });

  await sendParamsToDynamoDB(params);
  return nextVersion;
}
