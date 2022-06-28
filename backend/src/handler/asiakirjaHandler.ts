import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import {
  AsiakirjaTyyppi,
  EsikatseleAsiakirjaPDFQueryVariables,
  Kieli,
  PDF,
  TallennaProjektiInput,
} from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { asiakirjaService, NahtavillaoloKuulutusAsiakirjaTyyppi } from "../asiakirja/asiakirjaService";
import { projektiAdapter } from "./projektiAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { DBProjekti, Vuorovaikutus } from "../database/model";

async function handleAloitusKuulutus(
  projekti: DBProjekti,
  asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS | AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
  kieli: Kieli,
  muutokset: TallennaProjektiInput
) {
  // AloitusKuulutusJulkaisu is waiting for approval, so that is the version to preview
  const aloitusKuulutusJulkaisu = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  if (aloitusKuulutusJulkaisu) {
    return asiakirjaService.createAloituskuulutusPdf({
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
    });
  } else {
    // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
    const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
    projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
    projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;

    return asiakirjaService.createAloituskuulutusPdf({
      aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projektiWithChanges),
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
    });
  }
}

async function handleYleisotilaisuusKutsu(
  projekti: DBProjekti,
  asiakirjaTyyppi: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
  kieli: Kieli,
  muutokset: TallennaProjektiInput
) {
  // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
  const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
  projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
  projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;

  return asiakirjaService.createYleisotilaisuusKutsuPdf({
    projekti: projektiWithChanges,
    vuorovaikutus: (muutokset.suunnitteluVaihe?.vuorovaikutus as Vuorovaikutus) || null,
    kieli,
    luonnos: true,
  });
}

async function handleNahtavillaoloKuulutus(
  projekti: DBProjekti,
  kieli: Kieli,
  muutokset: TallennaProjektiInput,
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi
) {
  // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
  const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
  projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
  projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;

  return asiakirjaService.createNahtavillaoloKuulutusPdf({
    projekti: projektiWithChanges,
    nahtavillaoloVaihe: asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiWithChanges),
    kieli,
    luonnos: true,
    asiakirjaTyyppi,
  });
}

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
      switch (asiakirjaTyyppi) {
        case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        case AsiakirjaTyyppi.ALOITUSKUULUTUS:
          return handleAloitusKuulutus(projekti, asiakirjaTyyppi, kieli, muutokset);
        case AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU:
          return handleYleisotilaisuusKutsu(projekti, asiakirjaTyyppi, kieli, muutokset);
        case AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS:
        case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE:
        case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE:
          return handleNahtavillaoloKuulutus(projekti, kieli, muutokset, asiakirjaTyyppi);
        default:
          throw new Error("Not implemented");
      }
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}
