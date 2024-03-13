import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { formatDate, toPdfPoints } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export class KiinteistonOmistajaHyvaksymispaatos extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  protected header: string;
  protected kieli: KaannettavaKieli;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  constructor(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
    kasittelynTila: KasittelynTila,
    params: HyvaksymisPaatosVaiheKutsuAdapterProps
  ) {
    const velho = params.velho;
    const kieli = params.kieli;
    if (!velho.tyyppi) {
      throw new Error("velho.tyyppi ei ole määritelty");
    }
    if (!velho.kunnat) {
      throw new Error("velho.kunnat ei ole määritelty");
    }
    if (!velho.suunnittelustaVastaavaViranomainen) {
      throw new Error("velho.suunnittelustaVastaavaViranomainen ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("hyvaksymisPaatosVaihe ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.kunnat) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat.kunnat ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat.viranomaiset) {
      throw new Error("hyvaksymisPaatosVaihe.ilmoituksenVastanottajat.viranomaiset ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.hallintoOikeus) {
      throw new Error("hyvaksymisPaatosVaihe.hallintoOikeus ei ole määritelty");
    }
    if (!hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva ei ole määritelty");
    }
    if (!kasittelynTila) {
      throw new Error("kasittelynTila ei ole määritelty");
    }
    if (!kasittelynTila.hyvaksymispaatos) {
      throw new Error("kasittelynTila.hyvaksymispaatos ei ole määritelty");
    }
    if (!kasittelynTila.hyvaksymispaatos.paatoksenPvm) {
      throw new Error("kasittelynTila.hyvaksymispaatos.paatoksenPvm ei ole määritelty");
    }
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(params, "lain2");
    super(kieli, kutsuAdapter, params.osoite, 350, toPdfPoints(21));
    this.kieli = kieli;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;
    this.kutsuAdapter.addTemplateResolver(this);

    const fileName = createPDFFileName(
      AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
      kutsuAdapter.asiakirjanMuoto,
      velho.tyyppi,
      kieli
    );
    this.header = kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen");
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  protected getIndention() {
    return toPdfPoints(25);
  }

  pyydamme_valittamaan_ilmoituksen(): string {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.pyydamme_valittamaan_ilmoituksen");
    } else {
      return "";
    }
  }

  hyvaksymis_pvm(): string {
    return formatDate(this.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm);
  }

  asianumero_traficom(): string {
    return this.kasittelynTila?.hyvaksymispaatos?.asianumero ?? "";
  }

  kuulutuspaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusPaiva);
  }

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.headerElement(this.header),
      ...this.paragraphs(),
      this.euLogoElement(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  ilmoituksen_vastaanottajille(): string {
    return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.muistutuksen_tehneille");
  }

  private paragraphs(): PDFStructureElement[] {
    return [
      this.paragraphFromKey("otsikko"),
      this.paragraphFromKey("muistuttajille_kappale3"),
      this.paragraphFromKey("kappale5"),
      this.paragraphFromKey("muistuttajille_kappale4"),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
    ].filter((elem): elem is PDFStructureElement => !!elem);;
  }

  paatoslaki(): string {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return this.kutsuAdapter.text("paatoslaki_rata");
    } else {
      return this.kutsuAdapter.text("paatoslaki_tie");
    }
  }
}
