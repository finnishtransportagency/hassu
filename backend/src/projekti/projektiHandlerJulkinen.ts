import { projektiDatabase } from "../database/projektiDatabase";
import * as API from "../../../common/graphql/apiModel";
import { LataaProjektiJulkinenQueryVariables } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";
import { assert } from "console";
import { isKieliTranslatable, KaannettavaKieli } from "../../../common/kaannettavatKielet";

export async function loadProjektiJulkinen(params: LataaProjektiJulkinenQueryVariables): Promise<API.ProjektiJulkinen> {
  const { oid } = params;
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid, false);
  assert(isKieliTranslatable(params.kieli), "Annettu kieli ei ollut käännettävä kieli");
  if (projektiFromDB) {
    const adaptedProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB, (params.kieli as KaannettavaKieli) || undefined);
    if (adaptedProjekti) {
      return adaptedProjekti;
    }
    log.info("Projektilla ei ole julkista sisältöä", { oid });
    throw new NotFoundError("Projektilla ei ole julkista sisältöä: " + oid);
  }
  throw new NotFoundError("Projektia ei löydy: " + oid);
}
