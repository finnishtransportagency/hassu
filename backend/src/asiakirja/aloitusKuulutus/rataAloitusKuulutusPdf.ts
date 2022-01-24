import log from "loglevel";
import { AloitusKuulutusPdf } from "./aloitusKuulutusPdf";

export class RataAloitusKuulutusPdf extends AloitusKuulutusPdf {
  private tietosuojaUrl = "www.vayla.fi/tietosuoja";

  protected addContent() {
    super.addContent();
    const logo = this.doc.struct(
      "Figure",
      {
        alt: "Väylävirasto Trafikledsverket",
      },
      [
        () => {
          const elyFileName = this.fileBasePath + "/files/vayla.png";
          log.info(elyFileName);
          this.doc.image(elyFileName, undefined, undefined, { scale: 0.22 });
        },
      ]
    );

    this.doc.addStructure(
      this.doc.struct("Document", {}, [
        logo,
        this.doc.struct("H1", {}, () => {
          this.doc.moveDown().font("ArialMTBold").fontSize(10).text("KUULUTUS SUUNNITTELUN ALOITTAMISESTA").moveDown();
        }),
        this.doc.struct("H2", {}, () => {
          this.doc
            .text(this.projekti.velho?.nimi || "")
            .font("ArialMT")
            .moveDown();
        }),

        this.paragraph(
          `Väylävirasto aloittaa otsikon mukaisen ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `
        ),

        this.paragraph(this.projekti.aloitusKuulutus?.hankkeenKuvaus || ""),

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
      ])
    );
  }
}
