import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";
import { AsiakirjaTyyppi, EsikatseleAsiakirjaPDFQueryVariables, Kieli, PDF, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { DBProjekti } from "../database/model";
import assert from "assert";
import { pdfGeneratorClient } from "../asiakirja/lambda/pdfGeneratorClient";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi, NahtavillaoloKuulutusAsiakirjaTyyppi } from "../asiakirja/asiakirjaTypes";

async function handleAloitusKuulutus(
  projekti: DBProjekti,
  asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS | AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
  kieli: Kieli,
  muutokset: TallennaProjektiInput
) {
  // AloitusKuulutusJulkaisu is waiting for approval, so that is the version to preview
  const aloitusKuulutusJulkaisu = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  if (aloitusKuulutusJulkaisu) {
    return pdfGeneratorClient.createAloituskuulutusPdf({
      oid: projekti.oid,
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet: projekti.kayttoOikeudet,
      euRahoitusLogot: projekti.euRahoitusLogot,
    });
  } else {
    // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
    const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
    projektiWithChanges.velho = projekti.velho; // Restore read-only velho data which was removed by adaptProjektiToSave
    projektiWithChanges.suunnitteluSopimus = projekti.suunnitteluSopimus;

    return pdfGeneratorClient.createAloituskuulutusPdf({
      oid: projekti.oid,
      aloitusKuulutusJulkaisu: asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projektiWithChanges),
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet: projekti.kayttoOikeudet,
      euRahoitusLogot: projekti.euRahoitusLogot,
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

  const velho = projektiWithChanges.velho;
  assert(velho, "Velho puuttuu");
  const vuorovaikutusKierros = projektiWithChanges.vuorovaikutusKierros;
  const kielitiedot = projektiWithChanges.kielitiedot;
  const suunnitteluSopimus = projektiWithChanges.suunnitteluSopimus || undefined;
  assert(vuorovaikutusKierros && kielitiedot);
  return pdfGeneratorClient.createYleisotilaisuusKutsuPdf({
    oid: projektiWithChanges.oid,
    hankkeenKuvaus: vuorovaikutusKierros.hankkeenKuvaus || undefined,
    velho,
    kayttoOikeudet: projektiWithChanges.kayttoOikeudet,
    vuorovaikutusKierrosJulkaisu: asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu(projektiWithChanges),
    kielitiedot,
    suunnitteluSopimus,
    kieli,
    luonnos: true,
    euRahoitusLogot: projekti.euRahoitusLogot,
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
  const velho = projekti.velho;
  assert(velho);
  projektiWithChanges.velho = velho; // Restore read-only velho data which was removed by adaptProjektiToSave
  const suunnitteluSopimus = projekti.suunnitteluSopimus || undefined;
  projektiWithChanges.suunnitteluSopimus = suunnitteluSopimus;
  return pdfGeneratorClient.createNahtavillaoloKuulutusPdf({
    oid: projekti.oid,
    velho: projektiWithChanges.velho,
    kayttoOikeudet: projektiWithChanges.kayttoOikeudet,
    suunnitteluSopimus,
    nahtavillaoloVaihe: asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiWithChanges),
    kieli,
    luonnos: true,
    asiakirjaTyyppi,
    euRahoitusLogot: projekti.euRahoitusLogot,
  });
}

async function handleHyvaksymisPaatosKuulutus(
  projekti: DBProjekti,
  kieli: Kieli,
  muutokset: TallennaProjektiInput,
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi
) {
  // Previewing projekti with unsaved changes. adaptProjektiToPreview combines database content with the user provided changes
  const projektiWithChanges = await projektiAdapter.adaptProjektiToPreview(projekti, muutokset);
  const velho = projekti.velho;
  assert(velho);
  projektiWithChanges.velho = velho; // Restore read-only velho data which was removed by adaptProjektiToSave

  const kasittelynTila = projektiWithChanges.kasittelynTila;
  assert(kasittelynTila);
  const muutostenAvaimet = Object.keys(muutokset);
  const avainPaatokselle = muutostenAvaimet.includes("hyvaksymisPaatosVaihe")
    ? "hyvaksymisPaatosVaihe"
    : muutostenAvaimet.includes("jatkoPaatos1Vaihe")
    ? "jatkoPaatos1Vaihe"
    : "jatkoPaatos2Vaihe";
  const vaihe = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projektiWithChanges, projektiWithChanges[avainPaatokselle]);
  return pdfGeneratorClient.createHyvaksymisPaatosKuulutusPdf({
    oid: projekti.oid,
    kayttoOikeudet: projektiWithChanges.kayttoOikeudet,
    kasittelynTila,
    hyvaksymisPaatosVaihe: vaihe,
    kieli,
    luonnos: true,
    asiakirjaTyyppi,
    euRahoitusLogot: projekti.euRahoitusLogot,
  });
}

export async function lataaAsiakirja({ oid, asiakirjaTyyppi, kieli, muutokset }: EsikatseleAsiakirjaPDFQueryVariables): Promise<PDF> {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("XLoading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      switch (asiakirjaTyyppi) {
        case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        case AsiakirjaTyyppi.ALOITUSKUULUTUS:
          return handleAloitusKuulutus(projekti, asiakirjaTyyppi, kieli || Kieli.SUOMI, muutokset);
        case AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU:
          return handleYleisotilaisuusKutsu(projekti, asiakirjaTyyppi, kieli || Kieli.SUOMI, muutokset);
        case AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS:
        case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE:
        case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE:
          return handleNahtavillaoloKuulutus(projekti, kieli || Kieli.SUOMI, muutokset, asiakirjaTyyppi);
        case AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS:
        case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE:
        case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA:
        case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE:
        case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE:
          return handleHyvaksymisPaatosKuulutus(projekti, kieli || Kieli.SUOMI, muutokset, asiakirjaTyyppi);
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
