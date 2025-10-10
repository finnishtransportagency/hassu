import { IlmoitusAsiakirjaTyyppi, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";
import { HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";

const vaiheet: Record<IlmoitusAsiakirjaTyyppi, { ilmoitus: string }> = {
  ILMOITUS_KUULUTUKSESTA: {
    ilmoitus: "asiakirja.ilmoitus.ilmoitus_vaihe_aloituskuulutus",
  },
  ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE: {
    ilmoitus: "asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_nahtaville_asettamista",
  },
  ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA: {
    ilmoitus: "asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_hyvaksymispaatosta",
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA: {
    ilmoitus: "asiakirja.ilmoitus.ilmoitus_vaihe_paatoksen_voimassaoloajan_pidentamisesta",
  },
  ILMOITUS_JATKOPAATOSKUULUTUKSESTA2: {
    ilmoitus: "asiakirja.ilmoitus.ilmoitus_vaihe_paatoksen_voimassaoloajan_pidentamisesta",
  },
};

export class Ilmoitus12TR extends SuunnittelunAloitusPdf {
  constructor(
    asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi,
    params: AloituskuulutusKutsuAdapterProps | NahtavillaoloVaiheKutsuAdapterProps | HyvaksymisPaatosVaiheKutsuAdapterProps
  ) {
    const headerKey = params.suunnitteluSopimus
      ? "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta_suunnittelusopimus"
      : "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta";
    super(params, headerKey, asiakirjaTyyppi);
    this.kutsuAdapter.addTemplateResolver(this);
  }

  ilmoitus_vaihe(): string {
    return this.kutsuAdapter.text(vaiheet[this.asiakirjaTyyppi as IlmoitusAsiakirjaTyyppi].ilmoitus);
  }

  ilmoitus_vaihe_pitka(): string {
    return this.kutsuAdapter.text(vaiheet[this.asiakirjaTyyppi as IlmoitusAsiakirjaTyyppi].ilmoitus + "_pitka");
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const paragraphs = [];
    if (this.params.suunnitteluSopimus && this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA) {
      paragraphs.push(this.pluralParagraphFromKey("asiakirja.ilmoitus.kappale1_suunnittelusopimus"));
    } else if (
      this.params.suunnitteluSopimus &&
      this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
    ) {
      paragraphs.push(this.pluralParagraphFromKey("asiakirja.ilmoitus.kappale1_suunnittelusopimus"));
    } else {
      paragraphs.push(this.paragraphFromKey("asiakirja.ilmoitus.kappale1"));
    }

    if (this.params.vahainenMenettely) {
      paragraphs.push(this.onKyseVahaisestaMenettelystaParagraph());
    }

    return [
      ...paragraphs,
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_julkaistaan"),
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_nahtavilla"),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot)),
    ];
  }

  get kuulutusOsoite(): string {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA) {
      return this.kutsuAdapter.aloituskuulutusUrl;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      return this.kutsuAdapter.nahtavillaoloUrl;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA) {
      return this.kutsuAdapter.linkki_hyvaksymispaatos;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA) {
      return this.kutsuAdapter.linkki_jatkopaatos1;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2) {
      return this.kutsuAdapter.linkki_jatkopaatos2;
    } else {
      return "";
    }
  }
}
