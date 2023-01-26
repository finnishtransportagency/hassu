import { projektiDatabase } from "../database/projektiDatabase";
import * as API from "../../../common/graphql/apiModel";
import { LataaProjektiJulkinenQueryVariables } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";

export async function loadProjektiJulkinen(params: LataaProjektiJulkinenQueryVariables): Promise<API.ProjektiJulkinen> {
  const { oid, vaihe } = params;
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid, false);
  if (projektiFromDB) {
    const adaptedProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB, vaihe || undefined, params.kieli || undefined);
    if (adaptedProjekti) {
      return adaptedProjekti;
    }
    log.info("Projektilla ei ole julkista sisältöä", { oid });
    throw new NotFoundError("Projektilla ei ole julkista sisältöä: " + oid);
  }
  throw new NotFoundError("Projektia ei löydy: " + oid);
}
