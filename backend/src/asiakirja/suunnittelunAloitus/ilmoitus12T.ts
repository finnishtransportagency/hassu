import { DBProjekti } from "../../database/model/projekti";
import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";

const header = "ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA";

export class Ilmoitus10T extends SuunnittelunAloitusPdf {
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
          `${this.projekti.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.projekti.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `
        ),

        this.paragraph(
          `Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa ${this.kuulutusOsoite}. `
        ),

        this.paragraph("Lisätietoja antavat "),
        this.doc.struct("P", {}, this.moreInfoElements),
      ])
    );
  }

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja ? "www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }
}
