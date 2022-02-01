import { DBProjekti } from "../../database/model/projekti";
import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";

const header = "ILMOITUS VÄYLÄVIRASTON KUULUTUKSESTA";

export class Ilmoitus10R extends SuunnittelunAloitusPdf {
  constructor(projekti: DBProjekti) {
    super(projekti, header);
  }

  protected addContent() {
    this.doc.addStructure(
      this.doc.struct("Document", {}, [
        this.logo,
        this.headerElement,
        this.titleElement,

        this.paragraph(
          `Väylävirasto julkaisee tietoverkossaan kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n laatimisen aloittamista. Väylävirasto saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. (ratalaki 95 §, HL 62 a §) `
        ),

        this.paragraph(
          `Kuulutus on julkaistu ${this.kuulutusPaiva}, Väyläviraston verkkosivuilla osoitteessa https://www.vayla.fi/kuulutukset. `
        ),

        this.paragraph("Lisätietoja antavat "),
        this.doc.struct("P", {}, this.moreInfoElements),
      ])
    );
  }
}
