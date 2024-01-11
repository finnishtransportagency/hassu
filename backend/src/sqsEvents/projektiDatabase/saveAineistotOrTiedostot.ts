import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { SimultaneousUpdateError } from "hassu-common/error";
import { log } from "../../logger";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Aineisto, LadattuTiedosto } from "../../database/model";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../../util/dateUtil";

export async function saveAineistotOrTiedostot({
  projektiTableName,
  oid,
  projektiVersio,
  uusiAineistot,
  pathToAineistot,
}: {
  projektiTableName: string;
  oid: string;
  projektiVersio: number;
  uusiAineistot: Array<Aineisto> | Array<LadattuTiedosto>;
  pathToAineistot: string;
}): Promise<void> {
  const uusiPaivitetty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);

  const updateExpression = `SET ${pathToAineistot} = :uusiAineistot, paivitetty = :uusiPaivitetty`;

  const params = new UpdateCommand({
    TableName: projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: {
      "#versio": "versio",
    },
    ExpressionAttributeValues: {
      ":uusiAineistot": uusiAineistot,
      ":uusiPaivitetty": uusiPaivitetty,
      ":versio": projektiVersio,
    },
    ConditionExpression: "attribute_not_exists(#versio) OR #versio = :versio",
  });

  if (log.isLevelEnabled("debug")) {
    log.debug("Updating projekti to Hassu with params", { params });
  }

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    await dynamoDBDocumentClient.send(params);
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
    }
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
