import { HyvaksymisPaatosVaiheJulkaisu, KasittelynTila } from "../../database/model/";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { formatDate } from "../asiakirjaUtil";
import { AsiakirjanMuoto } from "../asiakirjaTypes";
import { createPDFFileName } from "../pdfFileName";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

type AsiakirjaTyyppi6263 = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
>;

// noinspection JSUnusedGlobalSymbols
export class Kuulutus6263 extends CommonPdf<HyvaksymisPaatosVaiheKutsuAdapter> {
  protected header: string;
  protected kieli: KaannettavaKieli;
  private readonly asiakirjaTyyppi: AsiakirjaTyyppi6263;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  private kasittelynTila: KasittelynTila;

  constructor(
    asiakirjaTyyppi: AsiakirjaTyyppi6263,
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
    super(kieli, params.oid, kutsuAdapter);
    this.kieli = kieli;
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.addTemplateResolver(this);

    const fileName = createPDFFileName(asiakirjaTyyppi, kutsuAdapter.asiakirjanMuoto, velho.tyyppi, kieli);
    if (kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      this.header = kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.hyvaksymispaatoksesta_ilmoittaminen");
    } else {
      this.header = kutsuAdapter.title;
    }
    super.setupPDF(this.header, kutsuAdapter.nimi, fileName, kutsuAdapter.sopimus);
  }

  pyydamme_valittamaan_ilmoituksen(): string {
    if (
      this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA &&
      this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
    ) {
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
      this.sopimusLogoElement(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  ilmoituksen_vastaanottajille(): string {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE) {
      return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.lausunnonantajille");
    }
    return this.kutsuAdapter.text("asiakirja.hyvaksymispaatoksesta_ilmoittaminen.muistutuksen_tehneille");
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE) {
      return [
        this.paragraphFromKey("lausunnonantajille_kappale1"),
        this.paragraphFromKey("kappale2"),
        this.paragraphFromKey("kappale3"),
        this.paragraphFromKey("kappale4"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ];
    } else if (this.asiakirjaTyyppi == AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE) {
      return [
        this.paragraphFromKey("muistuttajille_kappale1"),
        this.paragraphFromKey("muistuttajille_kappale2"),
        this.paragraphFromKey("kappale3"),
        this.paragraphFromKey("kappale4"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct("P", {}, this.moreInfoElements(this.hyvaksymisPaatosVaihe.yhteystiedot, null, true)),
      ];
    } else {
      return [];
    }
  }
}
