import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import * as API from "hassu-common/graphql/apiModel";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../../util/dateUtil";
import { sendUpdateCommandToDynamoDB } from "./util";

export default async function palautaHyvaksymisEsityksenTilaMuokkaukseksiJaAsetaSyy(input: {
  oid: string;
  versio: number;
  syy: string;
}): Promise<number> {
  const { oid, versio, syy } = input;
  const nextVersion = versio + 1;
  const params = new UpdateCommand({
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "SET " +
      "#versio = :versio, " +
      "#muokattavaHyvaksymisEsitys.#tila = :muokkaus, " +
      "#muokattavaHyvaksymisEsitys.#palautusSyy = :syy, " +
      "#paivitetty = :paivitetty",
    ExpressionAttributeNames: {
      "#versio": "versio",
      "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
      "#tila": "tila",
      "#paivitetty": "paivitetty",
      "#hyvaksymisPaatosVaihe": "hyvaksymisPaatosVaihe",
      "#palautusSyy": "palautusSyy",
    },
    ExpressionAttributeValues: {
      ":versio": nextVersion,
      ":muokkaus": API.HyvaksymisTila.MUOKKAUS,
      ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      ":odottaaHyvaksyntaa": API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      ":syy": syy,
      ":versioFromInput": versio,
    },
    ConditionExpression:
      "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
      "attribute_not_exists(#hyvaksymisPaatosVaihe) AND " +
      "#muokattavaHyvaksymisEsitys.#tila = :odottaaHyvaksyntaa",
  });

  await sendUpdateCommandToDynamoDB(params);
  return nextVersion;
}
