import { DBProjekti } from "../../database/model/projekti";
import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";

const header = "ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA";

export class Ilmoitus12T extends SuunnittelunAloitusPdf {
  constructor(projekti: DBProjekti) {
    super(projekti, header);
  }

  protected addDocumentElements() {
    return [
      this.paragraph(
        `${this.projekti.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.projekti.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `
      ),

      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            `Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa `,
            {
              continued: true,
            }
          );
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

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja ? "https://www.vayla.fi/kuulutukset" : "https://www.ely-keskus.fi/kuulutukset";
  }
}
