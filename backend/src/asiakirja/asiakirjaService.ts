import { AsiakirjaTyyppi } from "../../../common/graphql/apiModel";
import { AloitusKuulutus10TR } from "./suunnittelunAloitus/aloitusKuulutus10TR";
import { Ilmoitus12TR } from "./suunnittelunAloitus/ilmoitus12TR";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Kuulutus30 } from "./suunnittelunAloitus/Kuulutus30";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
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

export class AsiakirjaService {
  async createAloituskuulutusPdf({
    oid,
    lyhytOsoite,
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu,
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
  }: CreateNahtavillaoloKuulutusPdfOptions): Promise<EnhancedPDF> {
    const params: NahtavillaoloVaiheKutsuAdapterProps = await createNahtavillaoloVaiheKutsuAdapterProps(
      oid,
      lyhytOsoite,
      kayttoOikeudet,
      nahtavillaoloVaihe,
      kieli,
      velho,
      suunnitteluSopimus,
      euRahoitusLogot
    );
    let pdf: EnhancedPDF | undefined;
    if (asiakirjaTyyppi == AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS) {
      pdf = await new Kuulutus30(
        { ...params, kirjaamoOsoitteet: await kirjaamoOsoitteetService.listKirjaamoOsoitteet() },
        nahtavillaoloVaihe
      ).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      pdf = await new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
      pdf = await new Kuulutus31(
        { ...params, kirjaamoOsoitteet: await kirjaamoOsoitteetService.listKirjaamoOsoitteet() },
        nahtavillaoloVaihe,
        await kirjaamoOsoitteetService.listKirjaamoOsoitteet()
      ).pdf(luonnos);
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
  }: CreateHyvaksymisPaatosKuulutusPdfOptions): Promise<EnhancedPDF> {
    assertIsDefined(kasittelynTila, "kasittelynTila puuttuu");
    const params = createHyvaksymisPaatosVaiheKutsuAdapterProps(
      oid,
      lyhytOsoite,
      kayttoOikeudet,
      kieli,
      hyvaksymisPaatosVaihe,
      kasittelynTila,
      euRahoitusLogot
    );

    if (
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE ||
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      return new Kuulutus6263(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS) {
      return new Kuulutus60(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE) {
      return new Kuulutus61(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA) {
      return new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA, params).pdf(luonnos);
    }
    throw new Error("Not implemented");
  }
}

export const asiakirjaService = new AsiakirjaService();
