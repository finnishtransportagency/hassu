import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { EsikatseleAsiakirjaPDFQueryVariables } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { projektiAdapter } from "./projektiAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";

export async function lataaAsiakirja({ oid, asiakirjaTyyppi, muutokset }: EsikatseleAsiakirjaPDFQueryVariables) {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti && projekti.aloitusKuulutus) {
      if (muutokset) {
        const projektiWithChanges = await projektiAdapter.adaptProjektiToSave(projekti, muutokset);
        projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
        projektiWithChanges.tyyppi = projekti.velho.tyyppi || projekti.tyyppi; // Restore tyyppi
        projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;
        return asiakirjaService.createPdf({
          aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projektiWithChanges),
          asiakirjaTyyppi,
        });
      } else {
        return asiakirjaService.createPdf({
          aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti),
          asiakirjaTyyppi,
        });
      }
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy tai sillä ei ole aloituskuulutusta`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
