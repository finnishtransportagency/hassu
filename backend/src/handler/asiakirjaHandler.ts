import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { LataaAsiakirjaPDFQueryVariables } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { projektiAdapter } from "./projektiAdapter";

export async function lataaAsiakirja({ oid, asiakirjaTyyppi, muutokset }: LataaAsiakirjaPDFQueryVariables) {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      if (muutokset) {
        const projektiWithChanges = await projektiAdapter.adaptProjektiToSave(projekti, muutokset);
        projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
        projektiWithChanges.tyyppi = projekti.tyyppi; // Restore tyyppi
        return asiakirjaService.createPdf({ projekti: projektiWithChanges, asiakirjaTyyppi });
      } else {
        return asiakirjaService.createPdf({ projekti, asiakirjaTyyppi });
      }
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
