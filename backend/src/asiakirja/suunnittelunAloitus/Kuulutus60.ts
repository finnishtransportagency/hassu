import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model/";
import { AsiakirjaTyyppi, Kieli } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { formatDate } from "../asiakirjaUtil";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;

// noinspection JSUnusedGlobalSymbols
export class Kuulutus60 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: Kieli;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  // private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
    kasittelynTila: KasittelynTila,
    props: HyvaksymisPaatosVaiheKutsuAdapterProps
  ) {
    const velho = props.velho;
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
    if (!hyvaksymisPaatosVaihe.kuulutusPaiva) {
      throw new Error("hyvaksymisPaatosVaihe.kuulutusPaiva ei ole määritelty");
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
    const kieli = props.kieli;
    const asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(props);
    super(kieli, kutsuAdapter);
    this.kieli = props.kieli;

    this.asiakirjanMuoto = asiakirjanMuoto;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.addTemplateResolver(this);
    const fileName = createPDFFileName(AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS, this.asiakirjanMuoto, velho.tyyppi, kieli);
    this.header = kutsuAdapter.text("asiakirja.kuulutus_hyvaksymispaatoksesta.otsikko");
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  hyvaksymis_pvm(): string {
    return formatDate(this.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm);
  }

  asianumero_traficom(): string {
    return this.kasittelynTila?.hyvaksymispaatos?.asianumero || "";
  }

  kuulutuspaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusPaiva);
  }

  kuulutusvaihepaattyypaiva(): string {
    return formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva);
  }

  hallinto_oikeus_genetiivi(): string {
    return this.kutsuAdapter.text("hallinto_oikeus_genetiivi." + this.hyvaksymisPaatosVaihe.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja();
    let elements: PDFKit.PDFStructureElementChild[];
    const nahtavillaoloaikaKappale: PDFKit.PDFStructureElementChild | undefined = this.nahtavillaoloaikaParagraph();
    if (nahtavillaoloaikaKappale) {
      elements = [
        this.logo(vaylaTilaaja),
        this.headerElement(this.header),
        this.headerElement(this.kutsuAdapter.title, false),
        nahtavillaoloaikaKappale,
        ...this.paragraphs(),
        this.toimivaltainenViranomainen(),
      ];
    } else {
      elements = [
        this.logo(vaylaTilaaja),
        this.headerElement(this.header),
        this.headerElement(this.kutsuAdapter.title, false),
        ...this.paragraphs(),
        this.toimivaltainenViranomainen(),
      ];
    }
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return [
        this.uudelleenKuulutusParagraph(),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale1"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale2"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale3"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale4"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale5"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ].filter((elem): elem is PDFStructureElement => !!elem);
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return [
        this.uudelleenKuulutusParagraph(),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale1"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale2"),
        this.paragraphBold(this.kutsuAdapter.text("asiakirja.kuulutus_hyvaksymispaatoksesta.nahtavilla_oleva_aineisto") + ":"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale3"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale4"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ].filter((elem): elem is PDFStructureElement => !!elem);
    }

    return [];
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  private nahtavillaoloaikaParagraph(): PDFStructureElement | undefined {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      const baseline = -7; // Tried with "alphabetic", but doesn't work https://github.com/foliojs/pdfkit/issues/994
      return this.doc.struct("P", {}, () => {
        this.doc.font("ArialMTBold");
        this.doc.text(this.kutsuAdapter.text("ui-otsikot.nahtavillaoloaika") + ": ", { baseline, continued: true });
        this.doc.font("ArialMT");
        this.doc
          .text(
            formatDate(this.hyvaksymisPaatosVaihe.kuulutusPaiva) + " - " + formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva),
            { baseline }
          )
          .moveDown();
      });
    }
    return undefined;
  }

  private toimivaltainenViranomainen() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      const kaannos = translate("vaylavirasto", this.kieli) || "";
      if (!kaannos) {
        throw new Error("Puuttuu käännös sanalta vaylavirasto");
      }
      return this.paragraph(kaannos);
    }
  }
}
