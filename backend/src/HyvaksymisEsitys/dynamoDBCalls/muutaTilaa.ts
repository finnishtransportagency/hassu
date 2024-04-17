import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import * as API from "hassu-common/graphql/apiModel";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../../util/dateUtil";
import { sendUpdateCommandToDynamoDB } from "./util";

export default async function muutaMuokattavanHyvaksymisEsityksenTilaa(input: {
  oid: string;
  versio: number;
  uusiTila: API.HyvaksymisTila;
  vanhaTila: API.HyvaksymisTila;
}): Promise<number> {
  const { oid, versio, uusiTila, vanhaTila } = input;
  const nextVersion = versio + 1;
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "SET " + "#versio = :versio, " + "#muokattavaHyvaksymisEsitys.#tila = :uusiTila, " + "#paivitetty = :paivitetty",
    ExpressionAttributeNames: {
      "#versio": "versio",
      "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
      "#tila": "tila",
      "#paivitetty": "paivitetty",
      "#hyvaksymisPaatosVaihe": "hyvaksymisPaatosVaihe",
    },
    ExpressionAttributeValues: {
      ":versio": nextVersion,
      ":uusiTila": uusiTila,
      ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      ":vanhaTila": vanhaTila,
    },
    ConditionExpression:
      "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
      "attribute_not_exists(#hyvaksymisPaatosVaihe) AND " +
      "#muokattavaHyvaksymisEsitys.#tila = :vanhaTila",
  });

  await sendUpdateCommandToDynamoDB(params);
  return nextVersion;
}
