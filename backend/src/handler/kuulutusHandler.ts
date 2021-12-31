import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { LataaKuulutusPDFQueryVariables } from "../../../common/graphql/apiModel";
import * as log from "loglevel";
import { NotFoundError } from "../error/NotFoundError";
import { kuulutusService } from "../kuulutus/kuulutusService";
import { projektiAdapter } from "./projektiAdapter";

export async function lataaKuulutus({ oid, kuulutusTyyppi, muutokset }: LataaKuulutusPDFQueryVariables) {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti ", oid);
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      if (muutokset) {
        const projektiWithChanges = await projektiAdapter.adaptProjektiToSave(projekti, muutokset);
        projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
        return kuulutusService.createPDF(projektiWithChanges, kuulutusTyyppi);
      } else {
        return kuulutusService.createPDF(projekti, kuulutusTyyppi);
      }
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
