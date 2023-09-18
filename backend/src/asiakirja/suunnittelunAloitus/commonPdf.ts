import { AbstractPdf, ParagraphOptions } from "../abstractPdf";
import { Kieli } from "../../../../common/graphql/apiModel";
import { LocalizedMap, Yhteystieto } from "../../database/model";
import { CommonKutsuAdapter } from "../adapter/commonKutsuAdapter";
import { formatNimi } from "../../util/userUtil";
import { fileService } from "../../files/fileService";
import { AsiakirjanMuoto, EnhancedPDF } from "../asiakirjaTypes";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { KaannettavaKieli } from "../../../../common/kaannettavatKielet";

export abstract class CommonPdf<T extends CommonKutsuAdapter> extends AbstractPdf {
  protected kieli: KaannettavaKieli;
  kutsuAdapter: T;
  protected euLogo?: string | Buffer;

  protected constructor(kieli: KaannettavaKieli, kutsuAdapter: T) {
    super();
    this.kieli = kieli;
    this.kutsuAdapter = kutsuAdapter;
  }

  public async pdf(luonnos: boolean): Promise<EnhancedPDF> {
    if (this.kutsuAdapter.euRahoitusLogot) {
      this.euLogo = await this.loadEuLogo(this.kutsuAdapter.euRahoitusLogot);
    }
    return super.pdf(luonnos);
  }

  protected selectText(suomiRuotsiParagraphs: string[]): string {
    if (this.kieli == Kieli.SUOMI && suomiRuotsiParagraphs.length > 0) {
      return suomiRuotsiParagraphs[0];
    } else if (this.kieli == Kieli.RUOTSI && suomiRuotsiParagraphs.length > 1) {
      return suomiRuotsiParagraphs[1];
    }
    return suomiRuotsiParagraphs[0];
  }

  protected tietosuojaParagraph(): PDFStructureElement {
    return this.paragraphFromKey("asiakirja.tietosuoja");
  }

  protected onKyseVahaisestaMenettelystaParagraph(): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.substituteText(this.kutsuAdapter.text("asiakirja.on_kyse_vahaisesta_menettelysta")));
  }

  isVaylaTilaaja(): boolean {
    return this.kutsuAdapter.isVaylaTilaaja();
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.paragraphBold(this.kutsuAdapter.text("asiakirja.lisatietoja_antavat"), { spacingAfter: 1 });
  }

  protected localizedParagraph(suomiRuotsiParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiParagraphs));
  }

  protected paragraphFromKey(key: string, options?: ParagraphOptions): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text(key), { ...options, markupAllowed: true });
  }

  protected localizedParagraphFromMap(localizations: { [key in Kieli]?: string }): PDFStructureElement {
    const text = localizations[this.kieli];
    if (text) {
      return this.paragraph(text);
    } else {
      return this.paragraph("");
    }
  }

  protected headerElement(header: string, spacingBefore = true): PDFStructureElement {
    return this.doc.struct("H1", {}, () => {
      if (spacingBefore) {
        this.doc.moveDown(1);
      }
      this.doc.font("ArialMTBold").fontSize(10).text(header).font("ArialMT").moveDown(1);
    });
  }

  protected titleElement(): PDFStructureElement {
    return this.doc.struct("H2", {}, () => {
      const parts = [this.kutsuAdapter.nimi];
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  protected moreInfoElements(
    yhteystiedot: Yhteystieto[] | null | undefined,
    yhteysHenkilot?: string[] | undefined | null,
    showOrganization = true,
    pakotaProjariTaiKunnanEdustaja = false
  ): PDFKit.PDFStructureElementChild[] {
    const allYhteystiedot = this.kutsuAdapter.yhteystiedot(yhteystiedot, yhteysHenkilot, pakotaProjariTaiKunnanEdustaja);
    return allYhteystiedot.map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
      const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
      const organization = showOrganization ? ` (${organisaatio}), ` : ",";
      const text = `${formatNimi({
        etunimi,
        sukunimi,
      })}${organization}\n${this.kutsuAdapter.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `;
      return () => {
        this.doc.text(text).moveDown();
      };
    });
  }

  protected euLogoElement(): PDFKit.PDFStructureElement {
    return this.doc.struct("DIV", {}, () => {
      this.euLogo && this.doc.image(this.euLogo, { height: 75 });
    });
  }

  asiatunnus(): string {
    return this.kutsuAdapter.asiatunnus;
  }

  async loadEuLogo(euRahoitusLogot: LocalizedMap<string>): Promise<string | Buffer | undefined> {
    const path = this.kieli === Kieli.SUOMI ? euRahoitusLogot?.SUOMI : euRahoitusLogot?.RUOTSI;
    if (path === undefined) {
      return undefined;
    }
    return fileService.getProjektiFile(this.kutsuAdapter.oid, path);
  }

  tien(): string {
    return (
      (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA
        ? this.kutsuAdapter.text("tien_rata")
        : this.kutsuAdapter.text("tien_tie")) || ""
    );
  }

  suunnitelman_isolla(): string {
    return this.kutsuAdapter.suunnitelman_isolla;
  }

  vahainen_menettely_lakiviite(): string {
    return (
      (this.kutsuAdapter.asiakirjanMuoto == AsiakirjanMuoto.RATA
        ? this.kutsuAdapter.text("asiakirja.vahainen_menettely_lakiviite_rata")
        : this.kutsuAdapter.text("asiakirja.vahainen_menettely_lakiviite_tie")) || ""
    );
  }
}
