import { AsiakirjaTyyppi, Kieli } from "../../../common/graphql/apiModel";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus12T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus12R } from "./suunnittelunAloitus/ilmoitus12R";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Kuulutus30 } from "./suunnittelunAloitus/Kuulutus30";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { IlmoitusParams } from "./suunnittelunAloitus/suunnittelunAloitusPdf";
import { Kuulutus31 } from "./suunnittelunAloitus/Kuulutus31";
import { Kuulutus6263 } from "./suunnittelunAloitus/Kuulutus6263";
import { Kuulutus60 } from "./suunnittelunAloitus/Kuulutus60";
import { Kuulutus61 } from "./suunnittelunAloitus/Kuulutus61";
import {
  AloituskuulutusPdfOptions,
  AsiakirjanMuoto,
  CreateHyvaksymisPaatosKuulutusPdfOptions,
  CreateNahtavillaoloKuulutusPdfOptions,
  determineAsiakirjaMuoto,
  EnhancedPDF,
  YleisotilaisuusKutsuPdfOptions,
} from "./asiakirjaTypes";

export class AsiakirjaService {
  createAloituskuulutusPdf({
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

    const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(
      aloitusKuulutusJulkaisu.velho.tyyppi,
      aloitusKuulutusJulkaisu.velho.vaylamuoto
    );
    const params: IlmoitusParams = {
      asiakirjanMuoto,
      hankkeenKuvaus: aloitusKuulutusJulkaisu.hankkeenKuvaus,
      kieli,
      kielitiedot: aloitusKuulutusJulkaisu.kielitiedot,
      kuulutusPaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
      velho: aloitusKuulutusJulkaisu.velho,
      yhteystiedot: aloitusKuulutusJulkaisu.yhteystiedot,
      suunnitteluSopimus: aloitusKuulutusJulkaisu.suunnitteluSopimus || undefined,
      kayttoOikeudet,
      uudelleenKuulutus: aloitusKuulutusJulkaisu.uudelleenKuulutus || undefined,
    };

    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ALOITUSKUULUTUS:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new AloitusKuulutus10T(params).pdf(luonnos);
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new AloitusKuulutus10R(params).pdf(luonnos);
            break;
          default:
            throw new Error(
              `Aloituskuulutuspohjaa ei pystytä päättelemään. asiakirjanMuoto:'${asiakirjanMuoto}' tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
            );
        }
        break;
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        switch (asiakirjanMuoto) {
          case AsiakirjanMuoto.TIE:
            pdf = new Ilmoitus12T(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, params).pdf(luonnos);
            break;
          case AsiakirjanMuoto.RATA:
            pdf = new Ilmoitus12R(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, params).pdf(luonnos);
            break;
          default:
            throw new Error(
              `Ilmoituspohjaa ei pystytä päättelemään. tyyppi: '${aloitusKuulutusJulkaisu.velho.tyyppi}', vaylamuoto: '${aloitusKuulutusJulkaisu.velho?.vaylamuoto}'`
            );
        }
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
    const asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    const params: IlmoitusParams = {
      asiakirjanMuoto,
      hankkeenKuvaus: nahtavillaoloVaihe.hankkeenKuvaus,
      kielitiedot: nahtavillaoloVaihe.kielitiedot,
      kuulutusPaiva: nahtavillaoloVaihe.kuulutusPaiva,
      velho: nahtavillaoloVaihe.velho,
      yhteystiedot: nahtavillaoloVaihe.yhteystiedot || [],
      kayttoOikeudet,
      kieli,
      suunnitteluSopimus,
    };
    let pdf: EnhancedPDF | undefined;
    if (asiakirjaTyyppi == AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS) {
      pdf = await new Kuulutus30(params, nahtavillaoloVaihe, await kirjaamoOsoitteetService.listKirjaamoOsoitteet()).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      if (asiakirjanMuoto == AsiakirjanMuoto.TIE) {
        pdf = await new Ilmoitus12T(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else if (asiakirjanMuoto == AsiakirjanMuoto.RATA) {
        pdf = await new Ilmoitus12R(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else {
        throw new Error("Asiakirjan muoto ei tuettu");
      }
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
    suunnitteluSopimus,
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
    const asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    const params: IlmoitusParams = {
      asiakirjanMuoto,
      oid,
      kielitiedot: hyvaksymisPaatosVaihe.kielitiedot,
      hankkeenKuvaus: { [Kieli.SUOMI]: "", [Kieli.RUOTSI]: "", [Kieli.SAAME]: "" },
      kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
      velho: hyvaksymisPaatosVaihe.velho,
      yhteystiedot: hyvaksymisPaatosVaihe.yhteystiedot,
      kayttoOikeudet,
      kieli,
      suunnitteluSopimus,
    };

    if (
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE ||
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      return new Kuulutus6263(asiakirjaTyyppi, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS) {
      return new Kuulutus60(asiakirjanMuoto, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE) {
      return new Kuulutus61(asiakirjanMuoto, hyvaksymisPaatosVaihe, kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE) {
      return this.ilmoitus12(asiakirjanMuoto, params, luonnos);
    }
    throw new Error("Not implemented");
  }

  private ilmoitus12(asiakirjanMuoto: AsiakirjanMuoto, params: IlmoitusParams, luonnos: boolean) {
    if (asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return new Ilmoitus12T(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, params).pdf(luonnos);
    } else if (asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return new Ilmoitus12R(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, params).pdf(luonnos);
    } else {
      throw new Error("Asiakirjan muoto ei tuettu");
    }
  }
}

export const asiakirjaService = new AsiakirjaService();
