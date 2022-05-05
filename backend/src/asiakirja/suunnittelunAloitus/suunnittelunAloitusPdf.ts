import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { CommonPdf } from "./commonPdf";
import { KutsuAdapter } from "./KutsuAdapter";
import PDFStructureElement = PDFKit.PDFStructureElement;
export abstract class SuunnittelunAloitusPdf extends CommonPdf {
  protected header: string;
  protected aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli, header: string) {
    const kutsuAdapter = new KutsuAdapter({
      aloitusKuulutusJulkaisu,
      kieli,
      projektiTyyppi: aloitusKuulutusJulkaisu.velho.tyyppi,
    });
    super(header, kieli, kutsuAdapter, header + " " + kutsuAdapter.nimi);
    this.header = header;
    this.aloitusKuulutusJulkaisu = aloitusKuulutusJulkaisu;
  }

  protected addContent(): void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(this.isVaylaTilaaja(this.aloitusKuulutusJulkaisu.velho)),
      this.headerElement(this.header),
      this.titleElement(),
      ...this.addDocumentElements(),
    ];
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected get projektiTyyppi(): string {
    let tyyppi = "";
    switch (this.aloitusKuulutusJulkaisu.velho.tyyppi) {
      case ProjektiTyyppi.TIE:
        tyyppi = "tiesuunnitelma";
        break;
      case ProjektiTyyppi.YLEINEN:
        tyyppi = "yleissuunnitelma";
        break;
      case ProjektiTyyppi.RATA:
        tyyppi = "ratasuunnitelma";
        break;
    }
    return tyyppi;
  }

  protected get kuulutusPaiva(): string {
    return this.aloitusKuulutusJulkaisu?.kuulutusPaiva
      ? new Date(this.aloitusKuulutusJulkaisu?.kuulutusPaiva).toLocaleDateString("fi")
      : "DD.MM.YYYY";
  }

  protected get tilaajaGenetiivi(): string {
    const tilaajaOrganisaatio = this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio;
    return tilaajaOrganisaatio
      ? tilaajaOrganisaatio === "Väylävirasto"
        ? "Väyläviraston"
        : tilaajaOrganisaatio?.slice(0, -1) + "ksen"
      : "Tilaajaorganisaation";
  }

  protected hankkeenKuvaus(): PDFStructureElement {
    return this.localizedParagraphFromMap(this.aloitusKuulutusJulkaisu?.hankkeenKuvaus);
  }
}
