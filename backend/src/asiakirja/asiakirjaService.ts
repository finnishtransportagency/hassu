import { AsiakirjaTyyppi, Kieli, LaskuriTyyppi } from "../../../common/graphql/apiModel";
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
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { AloituskuulutusKutsuAdapterProps } from "./adapter/aloituskuulutusKutsuAdapter";
import { HyvaksymisPaatosVaiheKutsuAdapterProps } from "./adapter/hyvaksymisPaatosVaiheKutsuAdapter";

export class AsiakirjaService {
  async createAloituskuulutusPdf({
    oid,
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu,
    kieli,
    luonnos,
    kayttoOikeudet,
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
    if (!aloitusKuulutusJulkaisu.kuulutusPaiva) {
      throw new Error("aloitusKuulutusJulkaisu.kuulutusPaiva puuttuu");
    }

    const params: AloituskuulutusKutsuAdapterProps = {
      oid,
      hankkeenKuvaus: aloitusKuulutusJulkaisu.hankkeenKuvaus,
      kieli,
      kielitiedot: aloitusKuulutusJulkaisu.kielitiedot,
      kuulutusPaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: await calculateEndDate({
        alkupaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      }),
      velho: aloitusKuulutusJulkaisu.velho,
      yhteystiedot: aloitusKuulutusJulkaisu.yhteystiedot,
      suunnitteluSopimus: aloitusKuulutusJulkaisu.suunnitteluSopimus || undefined,
      kayttoOikeudet,
      uudelleenKuulutus: aloitusKuulutusJulkaisu.uudelleenKuulutus || undefined,
    };

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

  createYleisotilaisuusKutsuPdf(options: YleisotilaisuusKutsuPdfOptions): Promise<EnhancedPDF> {
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
    return new Kutsu20(options).pdf(luonnos);
  }

  async createNahtavillaoloKuulutusPdf({
    oid,
    velho,
    nahtavillaoloVaihe,
    kieli,
    luonnos,
    asiakirjaTyyppi,
    kayttoOikeudet,
    suunnitteluSopimus,
  }: CreateNahtavillaoloKuulutusPdfOptions): Promise<EnhancedPDF> {
    if (!velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    if (!nahtavillaoloVaihe.hankkeenKuvaus) {
      throw new Error("nahtavillaoloVaihe.hankkeenKuvaus puuttuu");
    }
    if (!nahtavillaoloVaihe.kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva puuttuu");
    }
    if (!nahtavillaoloVaihe.yhteystiedot) {
      throw new Error("nahtavillaoloVaihe.yhteystiedot puuttuu");
    }
    const params: AloituskuulutusKutsuAdapterProps = {
      oid,
      ilmoituksenVastaanottajat: nahtavillaoloVaihe.ilmoituksenVastaanottajat,
      hankkeenKuvaus: nahtavillaoloVaihe.hankkeenKuvaus,
      kielitiedot: nahtavillaoloVaihe.kielitiedot,
      kuulutusPaiva: nahtavillaoloVaihe.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva || undefined,
      velho: nahtavillaoloVaihe.velho,
      yhteystiedot: nahtavillaoloVaihe.yhteystiedot || [],
      kayttoOikeudet,
      kieli,
      suunnitteluSopimus,
      uudelleenKuulutus: nahtavillaoloVaihe.uudelleenKuulutus || undefined,
    };
    let pdf: EnhancedPDF | undefined;
    if (asiakirjaTyyppi == AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS) {
      pdf = await new Kuulutus30(params, nahtavillaoloVaihe, await kirjaamoOsoitteetService.listKirjaamoOsoitteet()).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      pdf = await new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
      pdf = await new Kuulutus31(params, nahtavillaoloVaihe, await kirjaamoOsoitteetService.listKirjaamoOsoitteet()).pdf(luonnos);
    }
    if (pdf) {
      return pdf;
    }
    throw new Error("asiakirjaTyyppi ei ole tuettu");
  }

  async createHyvaksymisPaatosKuulutusPdf({
    oid,
    kieli,
    luonnos,
    hyvaksymisPaatosVaihe,
    kasittelynTila,
    asiakirjaTyyppi,
    kayttoOikeudet,
  }: CreateHyvaksymisPaatosKuulutusPdfOptions): Promise<EnhancedPDF> {
    const velho = hyvaksymisPaatosVaihe.velho;
    if (!velho) {
      throw new Error("hyvaksymisPaatosVaihe.velho puuttuu");
    }
    if (!velho.tyyppi) {
      throw new Error("hyvaksymisPaatosVaihe.velho.tyyppi puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("hyvaksymisPaatosVaihe.velho.vaylamuoto puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva puuttuu");
    }
    if (!kasittelynTila) {
      throw new Error("kasittelynTila puuttuu");
    }
    const params: HyvaksymisPaatosVaiheKutsuAdapterProps = {
      oid,
      kielitiedot: hyvaksymisPaatosVaihe.kielitiedot,
      hankkeenKuvaus: { [Kieli.SUOMI]: "", [Kieli.RUOTSI]: "", [Kieli.SAAME]: "" },
      kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
      velho: hyvaksymisPaatosVaihe.velho,
      yhteystiedot: hyvaksymisPaatosVaihe.yhteystiedot,
      kayttoOikeudet,
      kieli,
    };

    if (
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE ||
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      return new Kuulutus6263(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS) {
      return new Kuulutus60(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE) {
      return new Kuulutus61(hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE) {
      return new Ilmoitus12TR(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, params).pdf(luonnos);
    }
    throw new Error("Not implemented");
  }
}

export const asiakirjaService = new AsiakirjaService();
