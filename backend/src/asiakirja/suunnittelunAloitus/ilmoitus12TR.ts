import { IlmoitusAsiakirjaTyyppi, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import { AsiakirjaTyyppi } from "../../../../common/graphql/apiModel";

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
};

export class Ilmoitus12TR extends SuunnittelunAloitusPdf {
  private asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi;

  constructor(asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi, params: AloituskuulutusKutsuAdapterProps) {
    const headerKey =
      params.suunnitteluSopimus && !params.nahtavillaoloIlmoitus
        ? "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta_suunnittelusopimus"
        : "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta";
    super(params, headerKey, asiakirjaTyyppi);
    this.asiakirjaTyyppi = asiakirjaTyyppi;

    this.kutsuAdapter.addTemplateResolver(this);
  }

  ilmoitus_vaihe(): string {
    return this.kutsuAdapter.text(vaiheet[this.asiakirjaTyyppi].ilmoitus);
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const paragraphs = [];
    if (this.params.suunnitteluSopimus) {
      paragraphs.push(this.paragraphFromKey("asiakirja.ilmoitus.kappale1_suunnittelusopimus"));
    } else {
      paragraphs.push(this.paragraphFromKey("asiakirja.ilmoitus.kappale1"));
    }

    return [
      ...paragraphs,
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_julkaistaan"),
      this.paragraphFromKey("asiakirja.ilmoitus.kappale_kuulutus_nahtavilla"),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.params.yhteystiedot)),
    ];
  }

  get kuulutusOsoite() {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA) {
      return this.kutsuAdapter.aloituskuulutusUrl;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE) {
      return this.kutsuAdapter.nahtavillaoloUrl;
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA) {
      return this.kutsuAdapter.linkki_hyvaksymispaatos;
    } else {
      return "";
    }
  }
}
