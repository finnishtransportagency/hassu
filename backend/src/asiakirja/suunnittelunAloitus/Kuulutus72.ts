import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

// noinspection JSUnusedGlobalSymbols
export class Kuulutus72 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  protected header: string;
  protected kieli: KaannettavaKieli;
  private readonly asiakirjaTyyppi: AsiakirjaTyyppi;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  constructor(
    asiakirjaTyyppi: AsiakirjaTyyppi,
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
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(params);
    super(kieli, kutsuAdapter);
    this.kieli = kieli;
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.addTemplateResolver(this);

    const fileName = createPDFFileName(asiakirjaTyyppi, kutsuAdapter.asiakirjanMuoto, velho.tyyppi, kieli);
    if (kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      this.header = kutsuAdapter.text("asiakirja.jatkopaatoksesta1_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen");
    } else {
      this.header = kutsuAdapter.title;
    }
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName);
  }

  viimeinen_voimassaolovuosi(): string | null | undefined {
    return this.hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi;
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
    return this.kutsuAdapter.text("asiakirja.jatkopaatoksesta1_ilmoittaminen.maakunnalle");
  }

  private paragraphs(): PDFStructureElement[] {
    return [
      this.headerElement(this.kutsuAdapter.title, false),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta1_ilmoittaminen.lausunnonantajille_kappale1"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta1_ilmoittaminen.kappale2"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta1_ilmoittaminen.kappale3"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta1_ilmoittaminen.kappale4"),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
    ];
  }
}