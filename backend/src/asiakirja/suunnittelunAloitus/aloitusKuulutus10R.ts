import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";

const header = "KUULUTUS SUUNNITTELUN ALOITTAMISESTA";

export class AloitusKuulutus10R extends SuunnittelunAloitusPdf {
  private tietosuojaUrl = "https://www.vayla.fi/tietosuoja";

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu) {
    super(aloitusKuulutusJulkaisu, header);
  }

  protected addDocumentElements() {
    return [
      this.paragraph(
        `Väylävirasto aloittaa otsikon mukaisen ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `
      ),

      this.paragraph(this.aloitusKuulutusJulkaisu?.hankkeenKuvaus || ""),

      this.paragraph(
        `Väylävirasto on julkaissut kuulutuksen suunnittelun aloittamisesta ja maastotutkimuksista. Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisemisesta. (ratalaki 95 §, HL 62 a §) `
      ),

      this.paragraph(
        "Rataverkon haltijalla on oikeus tehdä suunnittelualueeseen kuuluvalla kiinteistöllä suunnitteluun liittyviä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (ratalaki 9 §). "
      ),
      this.paragraph(
        "Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (ratalaki 22 § ja 9 §). "
      ),

      this.paragraph(
        "Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta. Valmistuttuaan suunnitelma asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta. (ratalaki 22 §). "
      ),

      this.doc.struct("P", {}, [
        () => {
          this.doc.text(
            `Väylävirasto käsittelee suunnitelmaan laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
            { continued: true }
          );
        },
        this.doc.struct("Link", { alt: this.tietosuojaUrl }, () => {
          this.doc.fillColor("blue").text(this.tietosuojaUrl, {
            link: this.tietosuojaUrl,
            continued: true,
            underline: true,
          });
        }),
        () => {
          this.doc.fillColor("black").text(".", { link: undefined, underline: false }).moveDown();
        },
      ]),
      this.paragraph("Lisätietoja antavat "),
      this.doc.struct("P", {}, this.moreInfoElements),
    ];
  }
}
