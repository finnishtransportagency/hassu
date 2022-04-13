import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { CommonPdf, selectNimi } from "./commonPdf";
import PDFStructureElement = PDFKit.PDFStructureElement;

export abstract class KutsuPdf extends CommonPdf {
  protected header: string;
  protected aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  protected kieli: Kieli;

  protected constructor(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: Kieli,
    header: string,
    fileName: string
  ) {
    super(fileName, selectNimi(aloitusKuulutusJulkaisu, kieli), kieli);
    this.header = header;
    this.kieli = kieli;
    this.aloitusKuulutusJulkaisu = aloitusKuulutusJulkaisu;
  }

  protected addContent(): void {
    const vaylaTilaaja = this.isVaylaTilaaja(this.aloitusKuulutusJulkaisu);
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(vaylaTilaaja),
      this.headerElement(this.header),
      this.titleElement(this.aloitusKuulutusJulkaisu),
      ...this.addDocumentElements(),
    ].filter((element) => element);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected titleElement(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): PDFStructureElement {
    return this.doc.struct("H2", {}, () => {
      const parts = [selectNimi(aloitusKuulutusJulkaisu, this.kieli) + this.kuntaOrKunnat];
      this.doc.text(parts.join(", ")).font("ArialMT").moveDown();
    });
  }

  private get kuntaOrKunnat() {
    const kunnat = this.aloitusKuulutusJulkaisu.velho?.kunnat;
    if (kunnat) {
      return ", " + formatList(kunnat, this.kieli);
    }
    return "";
  }

  protected projektiTyyppiToSuunnitelmaa = (projektiTyyppi: ProjektiTyyppi): string => {
    if (this.kieli == Kieli.SUOMI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "yleissuunnitelmaa",
        [ProjektiTyyppi.TIE]: "tiesuunnitelmaa",
        [ProjektiTyyppi.RATA]: "ratasuunnitelmaa",
      }[projektiTyyppi];
    } else if (this.kieli == Kieli.RUOTSI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "utredningsplanen",
        [ProjektiTyyppi.TIE]: "vägplanen",
        [ProjektiTyyppi.RATA]: "järnvägsplanen",
      }[projektiTyyppi];
    }
  };

  protected get localizedKlo(): string {
    if (this.kieli == Kieli.SUOMI) {
      return "klo";
    } else {
      return "kl.";
    }
  }
}

export const formatList = (words: string[], kieli: Kieli): string => {
  if (words.length == 1) {
    return words[0];
  }
  const lastWord = words.slice(words.length - 1);
  const firstWords = words.slice(0, words.length - 1);
  return firstWords.join(", ") + andInLanguage[kieli] + lastWord;
};

const andInLanguage = { [Kieli.SUOMI]: " ja ", [Kieli.RUOTSI]: " och ", [Kieli.SAAME]: "" };

export const projektiTyyppiToFilenamePrefix = (projektiTyyppi: ProjektiTyyppi): string =>
  ({
    [ProjektiTyyppi.YLEINEN]: "YS ",
    [ProjektiTyyppi.TIE]: "TS ",
    [ProjektiTyyppi.RATA]: "",
  }[projektiTyyppi]);
