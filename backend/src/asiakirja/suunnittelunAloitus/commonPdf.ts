import { AbstractPdf } from "../abstractPdf";
import { Kieli, Viranomainen } from "../../../../common/graphql/apiModel";
import { SuunnitteluSopimusJulkaisu, Velho, Yhteystieto } from "../../database/model";
import { KutsuAdapter } from "./KutsuAdapter";
import { log } from "../../logger";
import PDFStructureElement = PDFKit.PDFStructureElement;

export abstract class CommonPdf extends AbstractPdf {
  protected kieli: Kieli;
  protected kutsuAdapter: KutsuAdapter;

  constructor(kieli: Kieli, kutsuAdapter: KutsuAdapter) {
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

  protected isVaylaTilaaja(velho: Velho): boolean {
    return velho.suunnittelustaVastaavaViranomainen == Viranomainen.VAYLAVIRASTO;
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text("asiakirja.lisatietoja_antavat"));
  }

  protected localizedParagraph(suomiRuotsiSaameParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiSaameParagraphs));
  }

  protected paragraphFromKey(key: string): PDFStructureElement {
    return this.paragraph(this.kutsuAdapter.text(key));
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

  protected logo(isVaylaTilaaja: boolean): PDFStructureElement {
    const alt = isVaylaTilaaja ? "Väylävirasto — Trafikledsverket" : "Elinkeino-, liikenne- ja ympäristökeskus";
    const filePath = isVaylaTilaaja ? "/files/vayla.png" : "/files/ely.png";
    return this.doc.struct(
      "Figure",
      {
        alt,
      },
      [
        () => {
          const fullFilePath = this.fileBasePath + filePath;
          log.debug(fullFilePath);
          this.doc.image(fullFilePath, undefined, undefined, { height: 83 });
        },
      ]
    );
  }

  protected moreInfoElements(
    yhteystiedot: Yhteystieto[] | null | undefined,
    suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | null | undefined,
    yhteysHenkilot?: string[] | undefined | null,
    showOrganization = true
  ): PDFKit.PDFStructureElementChild[] {
    return this.kutsuAdapter
      .yhteystiedot(yhteystiedot, suunnitteluSopimus || undefined, yhteysHenkilot)
      .map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti, titteli }) => {
        return () => {
          const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
          const organization = showOrganization ? `${organisaatio}, ` : "";
          const title = titteli ? `${titteli}, ` : "";
          this.doc
            .text(`${organization}${title}${etunimi} ${sukunimi}, ${this.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `)
            .moveDown();
        };
      });
  }

  protected moreInfoElementsStandardoiduillaYhteystiedoilla(
    yhteystiedot: Yhteystieto[],
    showOrganization = true
  ): PDFKit.PDFStructureElementChild[] {
    return yhteystiedot.map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti, titteli }) => {
      return () => {
        const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
        const organization = showOrganization ? `${organisaatio}, ` : "";
        const title = titteli ? `${titteli}, ` : "";
        this.doc
          .text(`${organization}${title}${etunimi} ${sukunimi}, ${this.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `)
          .moveDown();
      };
    });
  }

  private get localizedPuh(): string {
    if (this.kieli == Kieli.SUOMI) {
      return "puh.";
    } else {
      return "tel.";
    }
  }
}
