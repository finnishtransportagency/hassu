import { AsiakirjaTyyppi, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { CommonPdf } from "./commonPdf";
import { assertIsDefined } from "../../util/assertions";
import { createPDFFileName } from "../pdfFileName";
import { AloituskuulutusKutsuAdapter, AloituskuulutusKutsuAdapterProps } from "../adapter/aloituskuulutusKutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
import { NahtavillaoloVaiheKutsuAdapter, NahtavillaoloVaiheKutsuAdapterProps } from "../adapter/nahtavillaoloVaiheKutsuAdapter";
import { HyvaksymisPaatosVaiheKutsuAdapter, HyvaksymisPaatosVaiheKutsuAdapterProps } from "../adapter/hyvaksymisPaatosVaiheKutsuAdapter";

export type IlmoitusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2
>;

export abstract class SuunnittelunAloitusPdf extends CommonPdf<
  AloituskuulutusKutsuAdapter | NahtavillaoloVaiheKutsuAdapter | HyvaksymisPaatosVaiheKutsuAdapter
> {
  protected header: string;
  protected params: AloituskuulutusKutsuAdapterProps | NahtavillaoloVaiheKutsuAdapterProps | HyvaksymisPaatosVaiheKutsuAdapterProps;
  asiakirjaTyyppi: AsiakirjaTyyppi;

  protected constructor(
    params: AloituskuulutusKutsuAdapterProps | NahtavillaoloVaiheKutsuAdapterProps | HyvaksymisPaatosVaiheKutsuAdapterProps,
    headerKey: string,
    asiakirjaTyyppi: AsiakirjaTyyppi
  ) {
    if (!params.velho.tyyppi) {
      throw new Error("params.velho.tyyppi puuttuu");
    }
    if (!params.hankkeenKuvaus) {
      throw new Error("params.hankkeenKuvaus puuttuu");
    }
    if (params.velho.tyyppi == ProjektiTyyppi.RATA && params?.suunnitteluSopimus) {
      throw new Error("Ratasuunnitelmilla ei voi olla suunnittelusopimusta");
    }
    let kutsuAdapter;
    switch (asiakirjaTyyppi) {
      case AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA:
        kutsuAdapter = new AloituskuulutusKutsuAdapter(params as AloituskuulutusKutsuAdapterProps);
        break;
      case AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE:
        kutsuAdapter = new NahtavillaoloVaiheKutsuAdapter(params as NahtavillaoloVaiheKutsuAdapterProps);
        break;
      case AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA:
      case AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA:
      case AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2:
        kutsuAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(params as HyvaksymisPaatosVaiheKutsuAdapterProps);
        break;
      default:
        kutsuAdapter = new AloituskuulutusKutsuAdapter(params as AloituskuulutusKutsuAdapterProps);
    }
    super(params.kieli, params.oid, kutsuAdapter);
    this.asiakirjaTyyppi = asiakirjaTyyppi;
    this.kutsuAdapter.addTemplateResolver(this);

    const fileName = createPDFFileName(asiakirjaTyyppi, kutsuAdapter.asiakirjanMuoto, params.velho.tyyppi, params.kieli);
    const header = kutsuAdapter.text(headerKey);
    this.header = header;
    this.params = params;
    super.setupPDF(header, kutsuAdapter.nimi, fileName, kutsuAdapter.sopimus);
  }

  protected addContent(): void {
    const elements: (PDFKit.PDFStructureElementChild | undefined)[] = [
      this.headerElement(this.header),
      this.titleElement(),
      this.uudelleenKuulutusParagraph(),
      ...this.addDocumentElements(),
      this.euLogoElement(),
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
