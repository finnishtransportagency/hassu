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

        this.paragraph(this.startOfPlanningPhrase),

        this.paragraph(this.projekti.aloitusKuulutus?.hankkeenKuvaus || ""),

        this.paragraph(
          `Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla${
            this.projekti.aloitusKuulutus?.kuulutusPaiva
              ? " " + new Date(this.projekti.aloitusKuulutus?.kuulutusPaiva).toLocaleDateString("fi")
              : "."
          } `
        ),

        this.paragraph(
          "Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). "
        ),
        this.paragraph(
          "Suunnitelmasta vastaavalla on oikeus tehdä kiinteistöillä suunnittelutyön edellyttämiä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (laki liikennejärjestelmästä ja maanteistä LjMTL 16 §). "
        ),

        this.paragraph(
          "Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (LjMTL 16 § ja 27 §). "
        ),
        this.paragraph(
          "Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta ( LjMTL 27 § ja valtioneuvoston asetus maanteistä 3 §). "
        ),

        this.paragraph(
          "Valmistuttuaan suunnitelmat asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta (LjMTL 27 §). "
        ),

        this.doc.struct("P", {}, [
          () => {
            this.doc.text(
              `${this.projekti.velho?.tilaajaOrganisaatio} käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
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
        () => {
          this.doc.font("ArialMTBold");
          this.doc.text(this.kuuluttaja).moveDown();
        },
      ])
    );
  }

  private get kuuluttaja() {
    const suunnitteluSopimus = this.projekti.suunnitteluSopimus;
    if (suunnitteluSopimus?.kunta) {
      return this.capitalize(suunnitteluSopimus.kunta);
    }
    return this.projekti.velho?.tilaajaOrganisaatio || "Kuuluttaja";
  }

  private get tilaajaGenetiivi() {
    return this.projekti.velho?.tilaajaOrganisaatio
      ? this.projekti.velho?.tilaajaOrganisaatio === "Väylävirasto"
        ? "Väyläviraston"
        : this.projekti.velho?.tilaajaOrganisaatio?.slice(0, -1) + "ksen"
      : "Tilaajaorganisaation";
  }

  private get tietosuojaUrl() {
    return this.projekti.velho?.tilaajaOrganisaatio && this.projekti.velho?.tilaajaOrganisaatio === "Väylävirasto"
      ? "https://vayla.fi/tietosuoja"
      : "http://www.ely-keskus.fi/tietosuoja";
  }

  private get startOfPlanningPhrase() {
    let phrase = "";
    const suunnitteluSopimus = this.projekti.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      phrase = `${this.capitalize(this.projekti.suunnitteluSopimus?.kunta || "Kunta")}, sovittuaan asiasta ${
        this.tilaajaGenetiivi
      } kanssa, käynnistää ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `;
    } else {
      const tilaajaOrganisaatio = this.projekti.velho?.tilaajaOrganisaatio || "Tilaajaorganisaatio";
      const kunnat = this.projekti.velho?.kunnat;
      const organisaatiot = kunnat ? [tilaajaOrganisaatio, ...kunnat] : [tilaajaOrganisaatio];
      const viimeinenOrganisaatio = organisaatiot.slice(-1);
      const muut = organisaatiot.slice(0, -1);
      const aloittaa = muut.length > 0 ? "aloittavat" : "aloittaa";
      const organisaatiotText = (aloittaa ? muut.join(", ") + " ja " : "") + viimeinenOrganisaatio;
      phrase = `${organisaatiotText} ${aloittaa} ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `;
    }
    return phrase;
  }
}
