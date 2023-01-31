import { AbstractPdf, ParagraphOptions } from "../abstractPdf";
import { Kieli } from "../../../../common/graphql/apiModel";
import { Yhteystieto } from "../../database/model";
import { CommonKutsuAdapter } from "../adapter/commonKutsuAdapter";
import { formatNimi } from "../../util/userUtil";
import PDFStructureElement = PDFKit.PDFStructureElement;

export abstract class CommonPdf<T extends CommonKutsuAdapter> extends AbstractPdf {
  protected kieli: Kieli;
  kutsuAdapter: T;

  protected constructor(kieli: Kieli, kutsuAdapter: T) {
    super();
    this.kieli = kieli;
    this.kutsuAdapter = kutsuAdapter;
  }

  protected selectText(suomiRuotsiSaameParagraphs: string[]): string {
    if (this.kieli == Kieli.SUOMI && suomiRuotsiSaameParagraphs.length > 0) {
      return suomiRuotsiSaameParagraphs[0];
    } else if (this.kieli == Kieli.RUOTSI && suomiRuotsiSaameParagraphs.length > 1) {
      return suomiRuotsiSaameParagraphs[1];
    } else if (this.kieli == Kieli.SAAME && suomiRuotsiSaameParagraphs.length > 2) {
      return suomiRuotsiSaameParagraphs[2];
    }
    return suomiRuotsiSaameParagraphs[0];
  }

  protected tietosuojaParagraph(): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text("asiakirja.tietosuoja"));
  }

  isVaylaTilaaja(): boolean {
    return this.kutsuAdapter.isVaylaTilaaja();
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text("asiakirja.lisatietoja_antavat"), { spacingAfter: 1 });
  }

  protected localizedParagraph(suomiRuotsiSaameParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiSaameParagraphs));
  }

  protected paragraphFromKey(key: string, options?: ParagraphOptions): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text(key), options);
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

  asiatunnus(): string {
    return this.kutsuAdapter.asiatunnus;
  }
}
