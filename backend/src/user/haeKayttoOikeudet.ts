import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { DBProjekti } from "../database/model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import * as API from "hassu-common/graphql/apiModel";
import { requirePermissionLuku } from "./userService";
import { userHasAccessToProjekti, userIsAdmin, userIsProjectManagerOrSubstitute } from "hassu-common/util/userRights";

export default async function haeKayttoOikeudet(oid: string): Promise<API.KayttoOikeusTiedot> {
  const kayttaja = requirePermissionLuku();
  const projekti = await dynamoCall(oid);
  return {
    __typename: "KayttoOikeusTiedot",
    omaaMuokkausOikeuden: userIsAdmin(kayttaja) || userHasAccessToProjekti({ projekti, kayttaja }),
    onProjektipaallikkoTaiVarahenkilo: userIsAdmin(kayttaja) || userIsProjectManagerOrSubstitute({ kayttaja, projekti }),
    onYllapitaja: userIsAdmin(kayttaja),
  };
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
