import { IlmoitusAsiakirjaTyyppi, SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";
import { HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { PaatosTyyppi } from "../asiakirjaTypes";

export class Ilmoitus12TR extends SuunnittelunAloitusPdf {
  paatosTyyppi?: PaatosTyyppi;

  constructor(
    asiakirjaTyyppi: IlmoitusAsiakirjaTyyppi,
    params: AloituskuulutusKutsuAdapterProps | NahtavillaoloVaiheKutsuAdapterProps | HyvaksymisPaatosVaiheKutsuAdapterProps,
    paatosTyyppi?: PaatosTyyppi
  ) {
    const headerKey = params.suunnitteluSopimus
      ? "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta_suunnittelusopimus"
      : "asiakirja.ilmoitus.otsikko_ilmoitus_kuulutuksesta";
    super(params, headerKey, asiakirjaTyyppi);
    this.paatosTyyppi = paatosTyyppi;
    this.kutsuAdapter.addTemplateResolver(this);
  }

  ilmoitus_key(): string {
    if (this.paatosTyyppi === PaatosTyyppi.JATKOPAATOS1 || this.paatosTyyppi === PaatosTyyppi.JATKOPAATOS2) {
      return "asiakirja.ilmoitus.ilmoitus_vaihe_paatoksen_voimassaoloajan_pidentamisesta";
    } else if (this.paatosTyyppi === PaatosTyyppi.HYVAKSYMISPAATOS) {
      return "asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_hyvaksymispaatosta";
    } else if (this.asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA) {
      return "asiakirja.ilmoitus.ilmoitus_vaihe_aloituskuulutus";
    } else {
      return "asiakirja.ilmoitus.ilmoitus_vaihe_suunnitelman_nahtaville_asettamista";
    }
  }

  ilmoitus_vaihe(): string {
    return this.kutsuAdapter.text(this.ilmoitus_key());
  }

  ilmoitus_vaihe_pitka(): string {
    return this.kutsuAdapter.text(this.ilmoitus_key() + "_pitka");
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    const paragraphs = [];
    if (this.params.suunnitteluSopimus && this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA) {
      paragraphs.push(this.paragraphFromKey("asiakirja.ilmoitus.kappale1_suunnittelusopimus"));
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
    } else {
      return "";
    }
  }
}
