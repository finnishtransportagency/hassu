import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";

const header = "KUULUTUS SUUNNITTELUN ALOITTAMISESTA";

export class AloitusKuulutus10T extends SuunnittelunAloitusPdf {
  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu) {
    super(aloitusKuulutusJulkaisu, header);
  }

  protected addDocumentElements() {
    return [
      this.paragraph(this.startOfPlanningPhrase),

      this.paragraph(this.aloitusKuulutusJulkaisu?.hankkeenKuvaus || ""),

      this.paragraph(
        `Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. `
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
            `${this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio} käsittelee suunnitelman laatimiseen liittyen tarpeellisia henkilötietoja. Halutessasi tietää tarkemmin väyläsuunnittelun tietosuojakäytänteistä, tutustu verkkosivujen tietosuojaosioon osoitteessa `,
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
    ];
  }

  private get kuuluttaja() {
    const suunnitteluSopimus = this.aloitusKuulutusJulkaisu.suunnitteluSopimus;
    if (suunnitteluSopimus?.kunta) {
      return formatProperNoun(suunnitteluSopimus.kunta);
    }
    return this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio || "Kuuluttaja";
  }

  private get tietosuojaUrl() {
    return this.isVaylaTilaaja ? "https://vayla.fi/tietosuoja" : "https://www.ely-keskus.fi/tietosuoja";
  }

  private get startOfPlanningPhrase() {
    let phrase: string;
    const suunnitteluSopimus = this.aloitusKuulutusJulkaisu.suunnitteluSopimus;
    if (suunnitteluSopimus) {
      phrase = `${formatProperNoun(suunnitteluSopimus?.kunta || "Kunta")}, sovittuaan asiasta ${
        this.tilaajaGenetiivi
      } kanssa, käynnistää ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `;
    } else {
      const tilaajaOrganisaatio = this.aloitusKuulutusJulkaisu.velho?.tilaajaOrganisaatio || "Tilaajaorganisaatio";
      const kunnat = this.aloitusKuulutusJulkaisu.velho?.kunnat;
      const organisaatiot = kunnat ? [tilaajaOrganisaatio, ...kunnat] : [tilaajaOrganisaatio];
      const trimmattutOrganisaatiot = organisaatiot.map((organisaatio) => formatProperNoun(organisaatio));
      const viimeinenOrganisaatio = trimmattutOrganisaatiot.slice(-1);
      const muut = trimmattutOrganisaatiot.slice(0, -1);
      const aloittaa = muut.length > 0 ? "aloittavat" : "aloittaa";
      const organisaatiotText = (muut.length > 0 ? muut.join(", ") + " ja " : "") + viimeinenOrganisaatio;
      phrase = `${organisaatiotText} ${aloittaa} ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `;
    }
    return phrase;
  }
}
