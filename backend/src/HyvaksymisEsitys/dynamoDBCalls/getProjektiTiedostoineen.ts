import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../config";
import { DBProjekti } from "../../database/model";
import { getDynamoDBDocumentClient } from "../../aws/client";
import { log } from "../../logger";

export type ProjektiTiedostoineen = Pick<
  DBProjekti,
  | "oid"
  | "versio"
  | "salt"
  | "kielitiedot"
  | "kayttoOikeudet"
  | "velho"
  | "aloitusKuulutusJulkaisut"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
  | "muokattavaHyvaksymisEsitys"
  | "julkaistuHyvaksymisEsitys"
  | "aineistoHandledAt"
>;

export default async function haeHyvaksymisEsityksenTiedostoTiedot(oid: string): Promise<ProjektiTiedostoineen> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression:
      "oid, " +
      "versio, " +
      "salt, " +
      "kielitiedot, " +
      "kayttoOikeudet, " +
      "velho, " +
      "aloitusKuulutusJulkaisut, " +
      "vuorovaikutusKierrosJulkaisut, " +
      "nahtavillaoloVaiheJulkaisut, " +
      "muokattavaHyvaksymisEsitys, " +
      "julkaistuHyvaksymisEsitys, " +
      "aineistoHandledAt",
  });

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    const data = await dynamoDBDocumentClient.send(params);
    if (!data.Item) {
      log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
      throw new Error();
    }
    const projekti = data.Item as ProjektiTiedostoineen;
    return projekti;
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
