import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import { DBProjekti } from "../../database/model";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { log } from "../../logger";

export type HyvaksymisEsityksenTiedot = Pick<
  DBProjekti,
  "oid" | "versio" | "salt" | "kayttoOikeudet" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys" | "hyvaksymisPaatosVaihe"
>;

export default async function haeProjektinTiedotHyvaksymisEsityksesta(oid: string): Promise<HyvaksymisEsityksenTiedot> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression: "oid, versio, salt, kayttoOikeudet, muokattavaHyvaksymisEsitys, julkaistuHyvaksymisEsitys, hyvaksymisPaatosVaihe",
  });

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    const data = await dynamoDBDocumentClient.send(params);
    if (!data.Item) {
      log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
      throw new Error();
    }
    const projekti = data.Item as HyvaksymisEsityksenTiedot;
    return projekti;
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
