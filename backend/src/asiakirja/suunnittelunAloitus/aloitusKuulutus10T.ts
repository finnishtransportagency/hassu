import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { Kieli } from "../../../../common/graphql/apiModel";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITTELUN ALOITTAMISESTA",
  RUOTSI: "KUNGÖRELSE OM INLEDANDET AV PLANERINGEN",
};

export class AloitusKuulutus10T extends SuunnittelunAloitusPdf {
  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli) {
    super(aloitusKuulutusJulkaisu, kieli, headers[kieli == Kieli.SAAME ? Kieli.SUOMI : kieli]); //TODO lisää tuki Saamen eri muodoille
  }

  protected addDocumentElements() {
    return [
      this.paragraph(this.startOfPlanningPhrase),

      this.hankkeenKuvaus(),

      this.localizedParagraph([
        `Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. `,
        `RUOTSIKSI Kuulutus on julkaistu tietoverkossa ${this.tilaajaGenetiivi} verkkosivuilla ${this.kuulutusPaiva}. `,
      ]),

      this.localizedParagraph([
        "Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
        "RUOTSIKSI Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisusta (hallintolaki 62 a §). ",
      ]),
      this.localizedParagraph([
        "Suunnitelmasta vastaavalla on oikeus tehdä kiinteistöillä suunnittelutyön edellyttämiä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (laki liikennejärjestelmästä ja maanteistä LjMTL 16 §). ",
        "RUOTSIKSI Suunnitelmasta vastaavalla on oikeus tehdä kiinteistöillä suunnittelutyön edellyttämiä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (laki liikennejärjestelmästä ja maanteistä LjMTL 16 §). ",
      ]),

      this.localizedParagraph([
        "Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (LjMTL 16 § ja 27 §). ",
        "RUOTSIKSI Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (LjMTL 16 § ja 27 §). ",
      ]),
      this.localizedParagraph([
        "Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta ( LjMTL 27 § ja valtioneuvoston asetus maanteistä 3 §). ",
        "RUOTSIKSI Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta ( LjMTL 27 § ja valtioneuvoston asetus maanteistä 3 §). ",
      ]),

      this.localizedParagraph([
        "Valmistuttuaan suunnitelmat asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta (LjMTL 27 §). ",
        "RUOTSIKSI Valmistuttuaan suunnitelmat asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta (LjMTL 27 §). ",
      ]),

      this.viranomainenTietosuojaParagraph(this.aloitusKuulutusJulkaisu),

      this.lisatietojaAntavatParagraph(),
      this.doc.struct("P", {}, this.moreInfoElements(this.aloitusKuulutusJulkaisu)),
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
