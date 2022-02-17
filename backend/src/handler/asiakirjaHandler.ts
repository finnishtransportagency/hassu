import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { EsikatseleAsiakirjaPDFQueryVariables, PDF } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { projektiAdapter } from "./projektiAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";

export async function lataaAsiakirja({
  oid,
  asiakirjaTyyppi,
  kieli,
  muutokset,
}: EsikatseleAsiakirjaPDFQueryVariables): Promise<PDF> {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      // AloitusKuulutusJulkaisu is waiting for approval, so that is the version to preview
      const aloitusKuulutusJulkaisu = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
      if (aloitusKuulutusJulkaisu) {
        return asiakirjaService.createPdf({
          aloitusKuulutusJulkaisu,
          asiakirjaTyyppi,
          kieli,
        });
      } else {
        if (muutokset) {
          // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
          const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
          projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
          projektiWithChanges.tyyppi = projekti.velho.tyyppi || projekti.tyyppi; // Restore tyyppi
          projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;

          return asiakirjaService.createPdf({
            aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projektiWithChanges),
            asiakirjaTyyppi,
            kieli,
          });
        } else {
          // Previewing saved projekti
          return asiakirjaService.createPdf({
            aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti),
            asiakirjaTyyppi,
            kieli,
          });
        }
      }
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
