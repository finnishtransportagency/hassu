import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { translate } from "../../util/localization";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { formatList } from "../adapter/commonKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;

const baseline = -7;

// noinspection JSUnusedGlobalSymbols
export class Kuulutus71 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  protected header: string;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private asiakirjaTyyppi: AsiakirjaTyyppi;
  private kasittelynTila: KasittelynTila;

  constructor(
    asiakirjaTyyppi: AsiakirjaTyyppi,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu,
    kasittelynTila: KasittelynTila,
    props: HyvaksymisPaatosVaiheKutsuAdapterProps
  ) {
    const velho = props.velho;
    const kieli = props.kieli;
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
    if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE) {
      if (!kasittelynTila.ensimmainenJatkopaatos) {
        throw new Error("kasittelynTila.ensimmainenJatkopaatos ei ole määritelty");
      }
      if (!kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm) {
        throw new Error("kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm ei ole määritelty");
      }
    } else {
      if (!kasittelynTila.toinenJatkopaatos) {
        throw new Error("kasittelynTila.toinenJatkopaatos ei ole määritelty");
      }
      if (!kasittelynTila.toinenJatkopaatos.paatoksenPvm) {
        throw new Error("kasittelynTila.toinenJatkopaatos.paatoksenPvm ei ole määritelty");
      }
    }
    if (!kasittelynTila.hyvaksymispaatos) {
      throw new Error("kasittelynTila.hyvaksymispaatos ei ole määritelty");
    }
    if (!kasittelynTila.hyvaksymispaatos.paatoksenPvm) {
      throw new Error("kasittelynTila.hyvaksymispaatos.paatoksenPvm ei ole määritelty");
    }
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(props);
    super(kieli, kutsuAdapter);
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.kasittelynTila = kasittelynTila;
    this.kutsuAdapter.addTemplateResolver(this);
    const fileName = createPDFFileName(asiakirjaTyyppi, this.kutsuAdapter.asiakirjanMuoto, velho.tyyppi, kieli);
    this.header = kutsuAdapter.text("asiakirja.jatkopaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen");
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName, baseline);
  }

  linkki_jatkopaatos(): string {
    if (this.asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE) {
      return this.kutsuAdapter.linkki_jatkopaatos1;
    } else {
      return this.kutsuAdapter.linkki_jatkopaatos2;
    }
  }

  asianumero_traficom(): string {
    if (this.asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE) {
      return this.kasittelynTila?.ensimmainenJatkopaatos?.asianumero ?? "";
    } else {
      return this.kasittelynTila?.toinenJatkopaatos?.asianumero ?? "";
    }
  }

  viimeinen_voimassaolovuosi(): string | null | undefined {
    return this.hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi;
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.hyvaksymisPaatosVaihe.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }

  ilmoituksen_vastaanottajille(): string {
    return formatList(
      ([] as string[]).concat(
        this.hyvaksymisPaatosVaihe.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => {
          return this.kieli == Kieli.RUOTSI
            ? this.kutsuAdapter.text("viranomainen." + viranomainen.nimi)
            : this.kutsuAdapter.text("viranomaiselle." + viranomainen.nimi);
        }) ?? []
      ),
      this.kieli
    );
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      ...this.paragraphs(),
      this.toimivaltainenViranomainen(),
      this.euLogoElement(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  private paragraphs(): PDFStructureElement[] {
    return [
      this.headerElement(this.header, false),
      this.headerElement(this.kutsuAdapter.title, false),
      this.uudelleenKuulutusParagraph(),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kappale1"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kappale2"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kappale3"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kappale4"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kuulutuksesta_ilmoittaminen"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kuulutuksesta_ilmoittaminen_kappale1"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kuulutuksesta_ilmoittaminen_kappale2"),
      this.paragraphFromKey("asiakirja.jatkopaatoksesta_ilmoittaminen.kuulutuksesta_ilmoittaminen_kappale3"),
      this.tietosuojaParagraph(),
      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
    ].filter((elem): elem is PDFStructureElement => !!elem);
  }

  private toimivaltainenViranomainen() {
    if (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
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
