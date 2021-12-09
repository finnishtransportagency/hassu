import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { LataaKuulutusPDFQueryVariables } from "../../../common/graphql/apiModel";
import * as log from "loglevel";
import { NotFoundError } from "../error/NotFoundError";
import { kuulutusService } from "../kuulutus/kuulutusService";

export async function lataaKuulutus({ oid, kuulutusTyyppi }: LataaKuulutusPDFQueryVariables) {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti ", oid);
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return kuulutusService.createPDF(projekti, kuulutusTyyppi);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
