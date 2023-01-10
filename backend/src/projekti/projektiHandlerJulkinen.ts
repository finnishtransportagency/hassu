import { projektiDatabase } from "../database/projektiDatabase";
import * as API from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";

export async function loadProjektiJulkinen(oid: string): Promise<API.ProjektiJulkinen> {
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid, false);
  if (projektiFromDB) {
    const adaptedProjekti = projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (adaptedProjekti) {
      return adaptedProjekti;
    }
    log.info("Projektilla ei ole julkista sisältöä", { oid });
    throw new NotFoundError("Projektilla ei ole julkista sisältöä: " + oid);
  }
  throw new NotFoundError("Projektia ei löydy: " + oid);
}
