import { HyvaksymisPaatosVaihe, KasittelynTila, Velho } from "../../database/model/";
import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { translate } from "../../util/localization";
import { KutsuAdapter } from "./KutsuAdapter";
import { IlmoitusParams } from "./suunnittelunAloitusPdf";
import { formatDate } from "../asiakirjaUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;

const pdfTypeKeys: Record<AsiakirjanMuoto, Record<never, string>> = {
  TIE: { [ProjektiTyyppi.TIE]: "T431", [ProjektiTyyppi.YLEINEN]: "60YS" },
  RATA: { [ProjektiTyyppi.RATA]: "60R", [ProjektiTyyppi.YLEINEN]: "60YS" },
};

function createFileName(kieli: Kieli, pdfType: string) {
  const language = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
  return translate("tiedostonimi." + pdfType, language);
}

// noinspection JSUnusedGlobalSymbols
export class Kuulutus60 extends CommonPdf {
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  protected header: string;
  protected kieli: Kieli;
  private readonly velho: Velho;
  private hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe;
  private kasittelynTila: KasittelynTila;

  // private kirjaamoOsoitteet: KirjaamoOsoite[];

  constructor(
    asiakirjanMuoto: AsiakirjanMuoto,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    kasittelynTila: KasittelynTila,
    params: IlmoitusParams
  ) {
    const velho = params.velho;
    const kieli = params.kieli;
    const kutsuAdapter = new KutsuAdapter({
      oid: params.oid,
      kielitiedot: params.kielitiedot,
      velho,
      kieli,
      asiakirjanMuoto,
      projektiTyyppi: velho.tyyppi,
      kayttoOikeudet: params.kayttoOikeudet,
    });
    super(kieli, kutsuAdapter);

    this.velho = velho;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.hyvaksymisPaatosVaihe = hyvaksymisPaatosVaihe;
    this.kasittelynTila = kasittelynTila;

    this.kutsuAdapter.setTemplateResolver(this);

    const pdfType = pdfTypeKeys[asiakirjanMuoto]?.[velho.tyyppi];
    const fileName = createFileName(kieli, pdfType);
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
    return this.isVaylaTilaaja(this.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.velho);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.headerElement(this.header),
      this.headerElement(this.kutsuAdapter.title, false),
      this.nahtavillaoloaikaParagraph(),
      ...this.paragraphs(),
      this.toimivaltainenViranomainen(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  private paragraphs(): PDFStructureElement[] {
    if (this.asiakirjanMuoto == AsiakirjanMuoto.TIE) {
      return [
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale1"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale2"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale3"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale4"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.tie_kappale5"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct(
          "P",
          {},
          this.moreInfoElements(
            this.hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
            undefined,
            this.hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot,
            true
          )
        ),
      ];
    } else if (this.asiakirjanMuoto == AsiakirjanMuoto.RATA) {
      return [
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale1"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale2"),
        this.paragraphBold(
          this.kutsuAdapter.text("asiakirja.kuulutus_hyvaksymispaatoksesta.nahtavilla_oleva_aineisto") + ":"
        ),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale3"),
        this.paragraphFromKey("asiakirja.kuulutus_hyvaksymispaatoksesta.rata_kappale4"),
        this.tietosuojaParagraph(),
        this.lisatietojaAntavatParagraph(),
        this.doc.struct(
          "P",
          {},
          this.moreInfoElements(
            this.hyvaksymisPaatosVaihe.kuulutusYhteystiedot,
            undefined,
            this.hyvaksymisPaatosVaihe.kuulutusYhteysHenkilot,
            true
          )
        ),
      ];
    }

    return [];
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
            formatDate(this.hyvaksymisPaatosVaihe.kuulutusPaiva) +
              " - " +
              formatDate(this.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva),
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
      return this.paragraph(translate("vaylavirasto", this.kieli));
    }
  }
}
