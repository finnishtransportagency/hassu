import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { DBProjekti } from "../database/model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { adaptDBVaylaUsertoAPIProjektiKayttaja } from "../projekti/adapter/adaptToAPI";
import * as API from "hassu-common/graphql/apiModel";
import { requirePermissionLuku } from "./userService";

/**
 * Hakee projektin käyttöoikeudet
 *
 * @param oid projektin oid
 * @returns Lista ProjektiKayttaja-objekteja edustaen projektin käyttöoikeuksia
 */
export default async function haeKayttoOikeudet(oid: string): Promise<API.ProjektiKayttaja[]> {
  requirePermissionLuku();
  const projekti = await dynamoCall(oid);
  const kayttoOikeudet = projekti.kayttoOikeudet;
  return adaptDBVaylaUsertoAPIProjektiKayttaja(kayttoOikeudet);
}

async function dynamoCall(oid: string): Promise<Pick<DBProjekti, "kayttoOikeudet">> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
    ProjectionExpression: "kayttoOikeudet",
  });

  try {
    const dynamoDBDocumentClient = getDynamoDBDocumentClient();
    const data = await dynamoDBDocumentClient.send(params);
    if (!data.Item) {
      log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
      throw new Error();
    }
    const projekti = data.Item as Pick<DBProjekti, "kayttoOikeudet">;
    return projekti;
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e), { params });
    throw e;
  }
}
