import { projektiDatabase } from "../database/projektiDatabase";
import * as API from "../../../common/graphql/apiModel";
import { LataaProjektiJulkinenQueryVariables } from "../../../common/graphql/apiModel";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";
import assert from "assert";
import { isKieliTranslatable } from "../../../common/kaannettavatKielet";

export async function loadProjektiJulkinen(params: LataaProjektiJulkinenQueryVariables): Promise<API.ProjektiJulkinen> {
  const { oid } = params;
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid, false);
  if (params.kieli) {
    assert(isKieliTranslatable(params.kieli), "Annettu kieli ei ollut käännettävä kieli");
  }
  if (projektiFromDB) {
    const adaptedProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB, params.kieli || undefined);
    if (adaptedProjekti) {
      return adaptedProjekti;
    }
  }
  throw new NotFoundError("Projektia ei löydy: " + oid);
}
