import { AsiakirjaTyyppi, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { assertIsDefined } from "../../util/assertions";
import { createPDFFileName } from "../pdfFileName";
import { AloituskuulutusKutsuAdapter, AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;

export type IlmoitusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
>;

export abstract class SuunnittelunAloitusPdf extends CommonPdf<AloituskuulutusKutsuAdapter> {
  protected header: string;
  protected params: AloituskuulutusKutsuAdapterProps;

  protected constructor(params: AloituskuulutusKutsuAdapterProps, headerKey: string, asiakirjaTyyppi: AsiakirjaTyyppi) {
    if (!params.velho.tyyppi) {
      throw new Error("params.velho.tyyppi puuttuu");
    }
    if (!params.hankkeenKuvaus) {
      throw new Error("params.hankkeenKuvaus puuttuu");
    }
    if (params.velho.tyyppi == ProjektiTyyppi.RATA && params.suunnitteluSopimus) {
      throw new Error("Ratasuunnitelmilla ei voi olla suunnittelusopimusta");
    }
    const kutsuAdapter = new AloituskuulutusKutsuAdapter(params);
    super(params.kieli, kutsuAdapter);
    this.kutsuAdapter.addTemplateResolver(this);

    const fileName = createPDFFileName(asiakirjaTyyppi, kutsuAdapter.asiakirjanMuoto, params.velho.tyyppi, params.kieli);
    const header = kutsuAdapter.text(headerKey);
    super.setupPDF(header, kutsuAdapter.nimi, fileName);
    this.header = header;
    this.params = params;
  }

  protected addContent(): void {
    const elements: (PDFKit.PDFStructureElementChild | undefined)[] = [
      this.logo(this.isVaylaTilaaja()),
      this.headerElement(this.header),
      this.titleElement(),
      this.uudelleenKuulutusParagraph(),
      ...this.addDocumentElements(),
    ].filter((p) => p);
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected hankkeenKuvausParagraph(): PDFStructureElement {
    assertIsDefined(this.params.hankkeenKuvaus);
    return this.localizedParagraphFromMap(this.params.hankkeenKuvaus);
  }

  protected uudelleenKuulutusParagraph(): PDFStructureElement | undefined {
    if (this.params.uudelleenKuulutus?.selosteKuulutukselle) {
      return this.localizedParagraphFromMap(this.params.uudelleenKuulutus?.selosteKuulutukselle);
    }
  }
}
