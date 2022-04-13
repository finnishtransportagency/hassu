import { Kieli, ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, Kielitiedot } from "../../database/model/projekti";
import { CommonPdf } from "./commonPdf";

function isKieliSupported(kieli: Kieli, kielitiedot: Kielitiedot) {
  return kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli;
}

function selectNimi(julkaisu: AloitusKuulutusJulkaisu, kieli: Kieli): string {
  if (isKieliSupported(kieli, julkaisu.kielitiedot)) {
    if (kieli == Kieli.SUOMI) {
      return julkaisu?.velho.nimi;
    } else {
      return julkaisu.kielitiedot.projektinNimiVieraskielella;
    }
  }
  throw new Error("Pyydettyä kieliversiota ei ole saatavilla");
}

export abstract class SuunnittelunAloitusPdf extends CommonPdf {
  protected header: string;
  protected aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli, header: string) {
    super(header, selectNimi(aloitusKuulutusJulkaisu, kieli), kieli);
    this.header = header;
    this.aloitusKuulutusJulkaisu = aloitusKuulutusJulkaisu;
  }

  protected addContent():void {
    const elements: PDFKit.PDFStructureElementChild[] = [
      this.logo(this.isVaylaTilaaja(this.aloitusKuulutusJulkaisu)),
      this.headerElement(this.header),
      this.titleElement(this.aloitusKuulutusJulkaisu),
      ...this.addDocumentElements(),
    ];
    this.doc.addStructure(this.doc.struct("Document", {}, elements));
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    throw new Error("Method 'addDocumentElements()' must be implemented.");
  }

  protected get projektiTyyppi() {
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

  protected get kuulutusPaiva() {
    return this.aloitusKuulutusJulkaisu?.kuulutusPaiva
      ? new Date(this.aloitusKuulutusJulkaisu?.kuulutusPaiva).toLocaleDateString("fi")
      : "DD.MM.YYYY";
  }

  protected get tilaajaGenetiivi() {
    const tilaajaOrganisaatio = this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio;
    return tilaajaOrganisaatio
      ? tilaajaOrganisaatio === "Väylävirasto"
        ? "Väyläviraston"
        : tilaajaOrganisaatio?.slice(0, -1) + "ksen"
      : "Tilaajaorganisaation";
  }

  protected hankkeenKuvaus() {
    return this.localizedParagraphFromMap(this.aloitusKuulutusJulkaisu?.hankkeenKuvaus);
  }
}
