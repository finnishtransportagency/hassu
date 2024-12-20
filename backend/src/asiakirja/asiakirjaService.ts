import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { AloitusKuulutus10TR } from "./suunnittelunAloitus/aloitusKuulutus10TR";
import { Ilmoitus12TR } from "./suunnittelunAloitus/ilmoitus12TR";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Kuulutus30 } from "./suunnittelunAloitus/Kuulutus30";
import { Kuulutus31 } from "./suunnittelunAloitus/Kuulutus31";
import { Kuulutus6263 } from "./suunnittelunAloitus/Kuulutus6263";
import { Kuulutus60 } from "./suunnittelunAloitus/Kuulutus60";
import { Kuulutus61 } from "./suunnittelunAloitus/Kuulutus61";
import {
  AloituskuulutusPdfOptions,
  CreateHyvaksymisPaatosKuulutusPdfOptions,
  CreateNahtavillaoloKuulutusPdfOptions,
  EnhancedPDF,
  YleisotilaisuusKutsuPdfOptions,
} from "./asiakirjaTypes";
import { createAloituskuulutusKutsuAdapterProps } from "./adapter/aloituskuulutusKutsuAdapter";
import { assertIsDefined } from "../util/assertions";
import { createHyvaksymisPaatosVaiheKutsuAdapterProps } from "./adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { createNahtavillaoloVaiheKutsuAdapterProps, NahtavillaoloVaiheKutsuAdapterProps } from "./adapter/nahtavillaoloVaiheKutsuAdapter";
import { log } from "../logger";
import { Kuulutus70 } from "./suunnittelunAloitus/Kuulutus70";
import { Kuulutus71 } from "./suunnittelunAloitus/Kuulutus71";
import { Kuulutus72 } from "./suunnittelunAloitus/Kuulutus72";
import { getPaatosTyyppi } from "../projekti/adapter/projektiAdapterJulkinen";
import { KiinteistonOmistaja } from "./suunnittelunAloitus/KiinteistonOmistaja";
import { parameters } from "../aws/parameters";
import { KiinteistonOmistajaHyvaksymispaatos } from "./suunnittelunAloitus/KiinteistonOmistajaHyvaksymispaatos";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

export class AsiakirjaService {
  async createAloituskuulutusPdf({
    oid,
    lyhytOsoite,
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    kieli,
    luonnos,
    kayttoOikeudet,
    euRahoitusLogot,
    vahainenMenettely,
  }: AloituskuulutusPdfOptions): Promise<EnhancedPDF> {
    let pdf: Promise<EnhancedPDF>;
    if (!aloitusKuulutusJulkaisu.velho.tyyppi) {
      throw new Error("aloitusKuulutusJulkaisu.velho.tyyppi puuttuu");
    }
    if (!aloitusKuulutusJulkaisu.hankkeenKuvaus) {
      throw new Error("aloitusKuulutusJulkaisu.hankkeenKuvaus puuttuu");
    }
    if (!aloitusKuulutusJulkaisu.kielitiedot) {
      throw new Error("aloitusKuulutusJulkaisu.kielitiedot puuttuu");
    }
    const params = await createAloituskuulutusKutsuAdapterProps(
      oid,
      lyhytOsoite,
      kayttoOikeudet,
      kieli,
      asianhallintaPaalla,
      linkkiAsianhallintaan,
      aloitusKuulutusJulkaisu,
      euRahoitusLogot,
      vahainenMenettely
    );

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        pdf = new AloitusKuulutus10TR(params).pdf(luonnos);
        break;
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        pdf = new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, params).pdf(luonnos);
        break;
      default:
        throw new Error(`Asiakirjatyyppi ('${asiakirjaTyyppi}') ei ole vielä tuettu`);
    }
    return pdf;
  }

  async createYleisotilaisuusKutsuPdf(options: YleisotilaisuusKutsuPdfOptions): Promise<EnhancedPDF> {
    const { velho, luonnos } = options;
    if (!velho) {
      throw new Error("velho puuttuu");
    }
    if (!velho.tyyppi) {
      throw new Error("velho.tyyppi puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("velho.vaylamuoto puuttuu");
    }
    return await new Kutsu20(options).pdf(luonnos);
  }

  async createNahtavillaoloKuulutusPdf({
    oid,
    lyhytOsoite,
    velho,
    nahtavillaoloVaihe,
    kieli,
    luonnos,
    asiakirjaTyyppi,
    kayttoOikeudet,
    suunnitteluSopimus,
    euRahoitusLogot,
    vahainenMenettely,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    osoite,
  }: CreateNahtavillaoloKuulutusPdfOptions): Promise<EnhancedPDF> {
    const suomiFiEnabled = await parameters.isSuomiFiViestitIntegrationEnabled();
    const params: NahtavillaoloVaiheKutsuAdapterProps = await createNahtavillaoloVaiheKutsuAdapterProps(
      { oid, kayttoOikeudet, euRahoitusLogot, lyhytOsoite, suunnitteluSopimus, vahainenMenettely, velho },
      nahtavillaoloVaihe,
      kieli,
      asianhallintaPaalla,
      linkkiAsianhallintaan,
      osoite
    );
    let pdf: EnhancedPDF | undefined;
    if (asiakirjaTyyppi == AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS) {
      pdf = await new Kuulutus30(params, nahtavillaoloVaihe).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      pdf = await new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE && !suomiFiEnabled) {
      pdf = await new Kuulutus31(params, nahtavillaoloVaihe).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
      pdf = await new KiinteistonOmistaja(params, nahtavillaoloVaihe).pdf(luonnos);
    }
    if (pdf) {
      return pdf;
    }
    throw new Error("asiakirjaTyyppi ei ole tuettu");
  }

  async createHyvaksymisPaatosKuulutusPdf({
    oid,
    lyhytOsoite,
    kieli,
    luonnos,
    hyvaksymisPaatosVaihe,
    kasittelynTila,
    asiakirjaTyyppi,
    kayttoOikeudet,
    euRahoitusLogot,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    osoite,
    suunnitteluSopimus,
  }: CreateHyvaksymisPaatosKuulutusPdfOptions): Promise<EnhancedPDF> {
    assertIsDefined(kasittelynTila, "kasittelynTila puuttuu");
    log.debug("asiakirjaTyyppi: " + asiakirjaTyyppi);
    const params = createHyvaksymisPaatosVaiheKutsuAdapterProps(
      { oid, lyhytOsoite, kayttoOikeudet, euRahoitusLogot, kasittelynTila, suunnitteluSopimus },
      kieli,
      hyvaksymisPaatosVaihe,
      getPaatosTyyppi(asiakirjaTyyppi),
      asianhallintaPaalla,
      linkkiAsianhallintaan,
      osoite
    );
    const suomiFiEnabled = await parameters.isSuomiFiViestitIntegrationEnabled();
    if (
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE ||
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      if (
        suomiFiEnabled &&
        params.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS &&
        asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
      ) {
        return new KiinteistonOmistajaHyvaksymispaatos(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
      }
      return new Kuulutus6263(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi === AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS) {
      return new Kuulutus60(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE) {
      return new Kuulutus61(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA ||
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA ||
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2
    ) {
      return new Ilmoitus12TR(asiakirjaTyyppi, params).pdf(luonnos);
    } else if (asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS || asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2) {
      return new Kuulutus70(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE ||
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
    ) {
      return new Kuulutus71(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE ||
      asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE
    ) {
      return new Kuulutus72(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    }
    throw new Error("Not implemented");
  }
}

export const asiakirjaService = new AsiakirjaService();
