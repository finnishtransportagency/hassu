import { AbstractPdf } from "../abstractPdf";
import { Kieli, Viranomainen } from "../../../../common/graphql/apiModel";
import { SuunnitteluSopimus, Velho, Yhteystieto } from "../../database/model/projekti";
import { KutsuAdapter } from "./KutsuAdapter";
import { log } from "../../logger";
import PDFStructureElement = PDFKit.PDFStructureElement;

export abstract class CommonPdf extends AbstractPdf {
  protected kieli: Kieli;
  protected readonly kutsuAdapter: KutsuAdapter;

  protected constructor(header: string, kieli: Kieli, kutsuAdapter: KutsuAdapter, fileName: string) {
    super(header, kutsuAdapter.nimi, fileName);
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
  }

  protected vaylavirastoTietosuojaParagraph(): PDFStructureElement {
    const tietosuojaUrl = this.kutsuAdapter.tietosuojaUrl;
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `Väylävirasto käsittelee suunnitelmaan laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
            `Trafikledsverket behandlar personuppgifter som är nödvändiga för utarbetandet av planen. Om du vill veta mer om trafikledsplaneringens dataskyddspolicy, bekanta dig med sektionen om dataskydd på webbplatsen `,
          ]),
          { continued: true }
        );
      },
      this.link(tietosuojaUrl),
      () => {
        this.doc.fillColor("black").text(".", { link: undefined, underline: false }).moveDown();
      },
    ]);
  }

  protected viranomainenTietosuojaParagraph(velho: Velho): PDFStructureElement {
    const viranomainen = KutsuAdapter.tilaajaOrganisaatioForViranomainen(
      velho.suunnittelustaVastaavaViranomainen,
      this.kieli
    );
    const tietosuojaUrl = this.isVaylaTilaaja(velho)
      ? "https://vayla.fi/tietosuoja"
      : "https://www.ely-keskus.fi/tietosuoja";
    return this.doc.struct("P", {}, [
      () => {
        this.doc.text(
          this.selectText([
            `${viranomainen} käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
            `${viranomainen} behandlar personuppgifter som är nödvändiga för utarbetandet av planen. Om du vill veta mer om trafikledsplaneringens dataskyddspolicy, bekanta dig med sektionen om dataskydd på webbplatsen `,
          ]),
          { continued: true }
        );
      },
      this.link(tietosuojaUrl),
      () => {
        this.doc.fillColor("black").text(".", { link: undefined, underline: false }).moveDown();
      },
    ]);
  }

  private link(url) {
    return this.doc.struct("Link", { alt: url }, () => {
      this.doc.fillColor("blue").text(url, {
        link: url,
        continued: true,
        underline: true,
      });
    });
  }

  protected isVaylaTilaaja(velho: Velho): boolean {
    return velho.suunnittelustaVastaavaViranomainen == Viranomainen.VAYLAVIRASTO;
  }

  protected lisatietojaAntavatParagraph(): PDFStructureElement {
    return this.localizedParagraph(["Lisätietoja antavat ", "Mer information om planen "]);
  }

  protected localizedParagraph(suomiRuotsiSaameParagraphs: string[]): PDFStructureElement {
    return this.paragraph(this.selectText(suomiRuotsiSaameParagraphs));
  }

  protected localizedParagraphFromMap(localizations: { [key in Kieli]?: string }): PDFStructureElement {
    const text = localizations[this.kieli];
    if (text) {
      return this.paragraph(text);
    } else {
      return this.paragraph("");
    }
  }

  protected headerElement(header: string): PDFStructureElement {
    return this.doc.struct("H1", {}, () => {
      this.doc.moveDown(1).font("ArialMTBold").fontSize(10).text(header).moveDown(1);
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
          log.info(fullFilePath);
          this.doc.image(fullFilePath, undefined, undefined, { height: 83 });
        },
      ]
    );
  }

  protected moreInfoElements(
    yhteystiedot: Yhteystieto[],
    suunnitteluSopimus?: SuunnitteluSopimus,
    showOrganization = true
  ): PDFKit.PDFStructureElementChild[] {
    return this.kutsuAdapter
      .yhteystiedot(yhteystiedot, suunnitteluSopimus)
      .map(({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) => {
        return () => {
          const noSpamSahkoposti = sahkoposti.replace(/@/g, "(at)");
          const organization = showOrganization ? `${organisaatio}, ` : "";
          this.doc
            .text(`${organization}${etunimi} ${sukunimi}, ${this.localizedPuh} ${puhelinnumero}, ${noSpamSahkoposti} `)
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
