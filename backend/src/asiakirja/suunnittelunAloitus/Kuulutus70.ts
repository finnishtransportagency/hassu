import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model";
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
export class Kuulutus70 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: KaannettavaKieli;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;
  private asiakirjaTyyppi: AsiakirjaTyyppi;

  constructor(
    asiakirjaTyyppi: AsiakirjaTyyppi,
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
    if (asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS) {
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
    const kieli = props.kieli;
    const asiakirjanMuoto = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);
    const kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(props);
    super(kieli, props.oid, kutsuAdapter);
    this.kieli = props.kieli;
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.addTemplateResolver(this);
    const fileName = createPDFFileName(asiakirjaTyyppi, this.asiakirjanMuoto, velho.tyyppi, kieli);
    this.header = kutsuAdapter.text("asiakirja.kuulutus_jatkopaatos.otsikko");
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName, kutsuAdapter.sopimus);
  }

  linkki_jatkopaatos(): string {
    if (this.asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS) {
      return this.kutsuAdapter.linkki_jatkopaatos1;
    } else {
      return this.kutsuAdapter.linkki_jatkopaatos2;
    }
  }

  hyvaksymis_pvm(): string {
    if (this.asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS) {
      return formatDate(this.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm);
    } else {
      return formatDate(this.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm);
    }
  }

  asianumero_traficom(): string {
    if (this.asiakirjaTyyppi === AsiakirjaTyyppi.JATKOPAATOSKUULUTUS) {
      return this.kasittelynTila?.ensimmainenJatkopaatos?.asianumero ?? "";
    } else {
      return this.kasittelynTila?.toinenJatkopaatos?.asianumero ?? "";
    }
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

  viimeinen_voimassaolovuosi(): string | null | undefined {
    return this.hyvaksymisPaatosVaihe.viimeinenVoimassaolovuosi;
  }

  protected addContent(): void {
    this.doc.addStructure(
      this.doc.struct("Document", {}, [
        this.headerElement(this.header),
        this.headerElement(this.kutsuAdapter.title, false),
        ...this.paragraphs(),
        this.toimivaltainenViranomainen(),
        this.euLogoElement(),
        this.sopimusLogoElement(),
      ])
    );
  }

  private paragraphs(): PDFStructureElement[] {
    let kappale1;
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      kappale1 = this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.tie_kappale1");
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      kappale1 = this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.rata_kappale1");
    } else {
      return [];
    }
    return [
      this.uudelleenKuulutusParagraph(),
      kappale1,
      this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.kappale2"),
      this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.kappale3"),
      this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.kappale4"),
      this.paragraphFromKey("asiakirja.kuulutus_jatkopaatos.kappale5"),
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
