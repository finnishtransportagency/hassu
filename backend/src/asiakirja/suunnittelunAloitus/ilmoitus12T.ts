import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { Kieli } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA",
  RUOTSI: "MEDDELANDE OM KUNGÖRELSE FRÅN BEHÖRIG MYNDIGHET",
};

export class Ilmoitus12T extends SuunnittelunAloitusPdf {
  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli) {
    super(aloitusKuulutusJulkaisu, kieli, headers[kieli == Kieli.SAAME ? Kieli.SUOMI : kieli], AsiakirjanMuoto.TIE); //TODO lisää tuki Saamen eri muodoille
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.localizedParagraph([
        `${this.aloitusKuulutusJulkaisu.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `,
        `RUOTSIKSI ${this.aloitusKuulutusJulkaisu.velho.tilaajaOrganisaatio} julkaisee tietoverkossaan liikennejärjestelmästä ja maanteistä annetun lain (503/2005) sekä hallintolain 62 a §:n mukaisesti kuulutuksen, joka koskee otsikossa mainitun ${this.projektiTyyppi}n suunnittelun ja maastotöiden aloittamista. ${this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio} saattaa asian tiedoksi julkisesti kuuluttamalla siten, kuin julkisesta kuulutuksesta säädetään hallintolaissa, sekä julkaisemalla kuulutuksen yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä. `,
      ]),

      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            this.selectText([
              `Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa `,
              `RUOTSIKSI Kuulutus julkaistaan ${this.kuulutusPaiva}, ${this.tilaajaGenetiivi} tietoverkossa osoitteessa `,
            ]),
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
      this.lisatietojaAntavatParagraph(),
      this.doc.struct(
        "P",
        {},
        this.moreInfoElements(
          this.aloitusKuulutusJulkaisu.yhteystiedot,
          this.aloitusKuulutusJulkaisu.suunnitteluSopimus
        )
      ),
    ];
  }

  private get kuulutusOsoite() {
    return this.isVaylaTilaaja(this.aloitusKuulutusJulkaisu.velho)
      ? "https://www.vayla.fi/kuulutukset"
      : "https://www.ely-keskus.fi/kuulutukset";
  }
}
