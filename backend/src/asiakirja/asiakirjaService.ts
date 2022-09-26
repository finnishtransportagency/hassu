import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti, HyvaksymisPaatosVaiheJulkaisu, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { AloitusKuulutus10T } from "./suunnittelunAloitus/aloitusKuulutus10T";
import { AloitusKuulutus10R } from "./suunnittelunAloitus/aloitusKuulutus10R";
import { Ilmoitus12T } from "./suunnittelunAloitus/ilmoitus12T";
import { Ilmoitus12R } from "./suunnittelunAloitus/ilmoitus12R";
import { Kutsu20 } from "./suunnittelunAloitus/Kutsu20";
import { Vuorovaikutus } from "../database/model/";
import { Kutsu21 } from "./suunnittelunAloitus/Kutsu21";
import { EmailOptions } from "../email/email";
import { Kuulutus30 } from "./suunnittelunAloitus/Kuulutus30";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { IlmoitusParams } from "./suunnittelunAloitus/suunnittelunAloitusPdf";
import { Kuulutus31 } from "./suunnittelunAloitus/Kuulutus31";
import { Kuulutus6263 } from "./suunnittelunAloitus/Kuulutus6263";
import { Kuulutus60 } from "./suunnittelunAloitus/Kuulutus60";
import { Kuulutus61 } from "./suunnittelunAloitus/Kuulutus61";
import { Attachment } from "nodemailer/lib/mailer";

export type NahtavillaoloKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
>;

interface CreateNahtavillaoloKuulutusPdfOptions {
  projekti: DBProjekti;
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi;
}

interface YleisotilaisuusKutsuPdfOptions {
  projekti: DBProjekti;
  vuorovaikutus: Vuorovaikutus;
  kieli: Kieli;
  luonnos: boolean;
}

interface AloituskuulutusPdfOptions {
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
  luonnos: boolean;
}

export type EnhancedPDF = PDF & { textContent: string };

export type HyvaksymisPaatosKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
>;

interface CreateHyvaksymisPaatosKuulutusPdfOptions {
  projekti: DBProjekti;
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
}

export enum AsiakirjanMuoto {
  TIE = "TIE",
  RATA = "RATA",
}

export function determineAsiakirjaMuoto(tyyppi: ProjektiTyyppi, vaylamuoto: string[] | undefined | null): AsiakirjanMuoto {
  if (tyyppi === ProjektiTyyppi.TIE || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("tie"))) {
    return AsiakirjanMuoto.TIE;
  } else if (tyyppi === ProjektiTyyppi.RATA || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("rata"))) {
    return AsiakirjanMuoto.RATA;
  }
  throw new Error("Asiakirjan muotoa ei voitu päätellä");
}

export class AsiakirjaService {
  createAloituskuulutusPdf({ asiakirjaTyyppi, aloitusKuulutusJulkaisu, kieli, luonnos }: AloituskuulutusPdfOptions): Promise<EnhancedPDF> {
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
    if (!aloitusKuulutusJulkaisu.suunnitteluSopimus) {
      throw new Error("aloitusKuulutusJulkaisu.suunnitteluSopimus puuttuu");
    }
    const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(
      aloitusKuulutusJulkaisu.velho.tyyppi,
      aloitusKuulutusJulkaisu.velho.vaylamuoto
    );
    const params: IlmoitusParams = {
      hankkeenKuvaus: aloitusKuulutusJulkaisu.hankkeenKuvaus,
      kieli,
      kielitiedot: aloitusKuulutusJulkaisu.kielitiedot,
      kuulutusPaiva: aloitusKuulutusJulkaisu.kuulutusPaiva,
      velho: aloitusKuulutusJulkaisu.velho,
      yhteystiedot: aloitusKuulutusJulkaisu.yhteystiedot,
      suunnitteluSopimus: aloitusKuulutusJulkaisu.suunnitteluSopimus,
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

  createYleisotilaisuusKutsuPdf({ projekti, vuorovaikutus, kieli, luonnos }: YleisotilaisuusKutsuPdfOptions): Promise<EnhancedPDF> {
    if (!projekti.velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!projekti.velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!projekti.velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti.velho.tyyppi, projekti.velho.vaylamuoto);
    return new Kutsu20(projekti, vuorovaikutus, kieli, asiakirjanMuoto).pdf(luonnos);
  }

  async createNahtavillaoloKuulutusPdf({
    projekti,
    nahtavillaoloVaihe,
    kieli,
    luonnos,
    asiakirjaTyyppi,
  }: CreateNahtavillaoloKuulutusPdfOptions): Promise<EnhancedPDF> {
    if (!projekti.velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!projekti.velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!projekti.velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    if (!nahtavillaoloVaihe.hankkeenKuvaus) {
      throw new Error("nahtavillaoloVaihe.hankkeenKuvaus puuttuu");
    }
    if (!nahtavillaoloVaihe.kuulutusPaiva) {
      throw new Error("nahtavillaoloVaihe.kuulutusPaiva puuttuu");
    }
    if (!nahtavillaoloVaihe.kuulutusYhteystiedot) {
      throw new Error("nahtavillaoloVaihe.kuulutusYhteystiedot puuttuu");
    }
    if (!nahtavillaoloVaihe.kuulutusYhteysHenkilot) {
      throw new Error("nahtavillaoloVaihe.kuulutusYhteysHenkilot puuttuu");
    }
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti?.velho?.tyyppi, projekti?.velho?.vaylamuoto);
    const params: IlmoitusParams = {
      hankkeenKuvaus: nahtavillaoloVaihe.hankkeenKuvaus,
      kielitiedot: nahtavillaoloVaihe.kielitiedot,
      kuulutusPaiva: nahtavillaoloVaihe.kuulutusPaiva,
      velho: nahtavillaoloVaihe.velho,
      yhteystiedot: nahtavillaoloVaihe.kuulutusYhteystiedot,
      yhteysHenkilot: nahtavillaoloVaihe.kuulutusYhteysHenkilot,
      kayttoOikeudet: projekti.kayttoOikeudet,
      kieli,
    };
    if (asiakirjaTyyppi == AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS) {
      return new Kuulutus30(
        projekti,
        nahtavillaoloVaihe,
        kieli,
        asiakirjanMuoto,
        await kirjaamoOsoitteetService.listKirjaamoOsoitteet()
      ).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      if (asiakirjanMuoto == AsiakirjanMuoto.TIE) {
        return new Ilmoitus12T(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else if (asiakirjanMuoto == AsiakirjanMuoto.RATA) {
        return new Ilmoitus12R(AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else {
        throw new Error("Asiakirjan muoto ei tuettu");
      }
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
      return new Kuulutus31(
        projekti,
        nahtavillaoloVaihe,
        kieli,
        asiakirjanMuoto,
        await kirjaamoOsoitteetService.listKirjaamoOsoitteet()
      ).pdf(luonnos);
    }
    throw new Error("asiakirjaTyyppi ei ole tuettu");
  }

  async createHyvaksymisPaatosKuulutusPdf({
    projekti,
    kieli,
    luonnos,
    hyvaksymisPaatosVaihe,
    asiakirjaTyyppi,
  }: CreateHyvaksymisPaatosKuulutusPdfOptions): Promise<EnhancedPDF> {
    if (!projekti.velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!projekti.velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!projekti.velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusYhteystiedot) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusYhteystiedot puuttuu");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot puuttuu");
    }
    if (!projekti.kasittelynTila) {
      throw new Error("projekti.kasitteolynTila puuttuu");
    }
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti?.velho?.tyyppi, projekti?.velho?.vaylamuoto);
    const params: IlmoitusParams = {
      oid: projekti.oid,
      kielitiedot: hyvaksymisPaatosVaihe.kielitiedot,
      hankkeenKuvaus: { [Kieli.SUOMI]: "", [Kieli.RUOTSI]: "", [Kieli.SAAME]: "" },
      kuulutusPaiva: hyvaksymisPaatosVaihe.kuulutusPaiva,
      velho: hyvaksymisPaatosVaihe.velho,
      yhteystiedot: hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
      yhteysHenkilot: hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot,
      kayttoOikeudet: projekti.kayttoOikeudet,
      kieli,
    };

    if (
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE ||
      asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
      return new Kuulutus6263(asiakirjaTyyppi, asiakirjanMuoto, hyvaksymisPaatosVaihe, projekti.kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS) {
      return new Kuulutus60(asiakirjanMuoto, hyvaksymisPaatosVaihe, projekti.kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE) {
      return new Kuulutus61(asiakirjanMuoto, hyvaksymisPaatosVaihe, projekti.kasittelynTila, params).pdf(luonnos);
    } else if (asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE) {
      if (asiakirjanMuoto == AsiakirjanMuoto.TIE) {
        return new Ilmoitus12T(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else if (asiakirjanMuoto == AsiakirjanMuoto.RATA) {
        return new Ilmoitus12R(AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE, params).pdf(luonnos);
      } else {
        throw new Error("Asiakirjan muoto ei tuettu");
      }
    }
    throw new Error("Not implemented");
  }

  createYleisotilaisuusKutsuEmail({ projekti, vuorovaikutus, kieli }: YleisotilaisuusKutsuPdfOptions): EmailOptions {
    if (!projekti.velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!projekti.velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!projekti.velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    const asiakirjanMuoto = determineAsiakirjaMuoto(projekti.velho.tyyppi, projekti.velho.vaylamuoto);
    return new Kutsu21(projekti, vuorovaikutus, kieli, asiakirjanMuoto).createEmail();
  }

  createPDFAttachment(pdf: PDF): Attachment {
    return {
      filename: pdf.nimi,
      contentDisposition: "attachment",
      contentType: "application/pdf",
      content: Buffer.from(pdf.sisalto, "base64"),
    };
  }
}

export const asiakirjaService = new AsiakirjaService();
