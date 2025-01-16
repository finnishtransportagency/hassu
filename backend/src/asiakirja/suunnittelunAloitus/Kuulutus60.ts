import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model/";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { formatDate } from "../asiakirjaUtil";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

// noinspection JSUnusedGlobalSymbols
export class Kuulutus60 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: KaannettavaKieli;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kuulutettuYhdessaSuunnitelmanimi: string | undefined;
  private kasittelynTila: KasittelynTila;

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
    this.kuulutettuYhdessaSuunnitelmanimi = props.kuulutettuYhdessaSuunnitelmanimi;

    this.kutsuAdapter.addTemplateResolver(this);
    const fileName = createPDFFileName(AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS, this.asiakirjanMuoto, velho.tyyppi, kieli);
    this.header = kutsuAdapter.text("asiakirja.kuulutus_hyvaksymispaatoksesta.otsikko");
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
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

  hallinto_oikeus_genetiivi(): string {
    return this.kutsuAdapter.text("hallinto_oikeus_genetiivi." + this.hyvaksymisPaatosVaihe.hallintoOikeus);
  }

  kuulutusosoite(): string {
    return this.isVaylaTilaaja() ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    this.doc.addStructure(
      this.doc.struct("Document", {}, [
        this.headerElement(this.header),
        this.headerElement(this.kutsuAdapter.title, false),
        ...this.paragraphs(),
        this.toimivaltainenViranomainen(),
        this.euLogoElement(),
      ])
    );
  }

  private paragraphs(): PDFStructureElement[] {
    let kappale1;
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      kappale1 = this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale1");
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale1");
    } else {
      return [];
    }
    return [
      this.uudelleenKuulutusParagraph(),
      kappale1,
      this.kuulutettuYhdessaSuunnitelmaParagraph(),
      this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale2"),
      this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale3"),
      this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale4"),
      this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.kappale5"),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  private kuulutettuYhdessaSuunnitelmaParagraph(): PDFStructureElement | undefined {
    if (this.kuulutettuYhdessaSuunnitelmanimi) {
      return this.paragraphFromKey("liittyvat-suunnitelmat.kuulutettu-yhdessa-pdf");
    }
  }

  private toimivaltainenViranomainen() {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return this.paragraph(this.kutsuAdapter.tilaajaOrganisaatio);
    } else {
      const kaannos = translate("vaylavirasto", this.kieli) ?? "";
      if (!kaannos) {
        throw new Error("Puuttuu käännös sanalta vaylavirasto");
      }
      return this.paragraph(kaannos);
    }
  }
}
