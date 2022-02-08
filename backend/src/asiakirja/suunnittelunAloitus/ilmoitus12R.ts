import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";

const header = "ILMOITUS VÄYLÄVIRASTON KUULUTUKSESTA";

export class Ilmoitus12R extends SuunnittelunAloitusPdf {
  private kuulutusOsoite = "https://www.vayla.fi/kuulutukset";

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu) {
    super(aloitusKuulutusJulkaisu, header);
  }

  protected addDocumentElements() {
    return [
      this.paragraph(
        `Väylävirasto julkaisee tietoverkossaan kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n laatimisen aloittamista. Väylävirasto saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. (ratalaki 95 §, HL 62 a §) `
      ),
      this.doc.struct("P", {}, [
        () => {
          this.doc.text(`Kuulutus on julkaistu ${this.kuulutusPaiva}, Väyläviraston verkkosivuilla osoitteessa `, {
            continued: true,
          });
        },
        this.doc.struct("Link", { alt: this.kuulutusOsoite }, () => {
          this.doc.fillColor("blue").text(this.kuulutusOsoite, {
            link: this.kuulutusOsoite,
            continued: true,
            underline: true,
          });
        }),
        () => {
          this.doc.fillColor("black").text(". ", { link: undefined, underline: false }).moveDown();
        },
      ]),
      this.paragraph("Lisätietoja antavat "),
      this.doc.struct("P", {}, this.moreInfoElements),
    ];
  }
}
