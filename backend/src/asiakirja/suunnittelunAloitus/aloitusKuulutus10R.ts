import { SuunnittelunAloitusPdf } from "./suunnittelunAloitusPdf";
import { AloitusKuulutusJulkaisu } from "../../database/model/projekti";
import { Kieli } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";

const headers: Record<Kieli.SUOMI | Kieli.RUOTSI, string> = {
  SUOMI: "KUULUTUS SUUNNITTELUN ALOITTAMISESTA",
  RUOTSI: "KUNGÖRELSE OM INLEDANDET AV PLANERINGEN",
};

export class AloitusKuulutus10R extends SuunnittelunAloitusPdf {
  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu, kieli: Kieli) {
    super(aloitusKuulutusJulkaisu, kieli, headers[kieli == Kieli.SAAME ? Kieli.SUOMI : kieli], AsiakirjanMuoto.RATA); //TODO lisää tuki Saamen eri muodoille
  }

  protected addDocumentElements(): PDFKit.PDFStructureElementChild[] {
    return [
      this.localizedParagraph([
        `Väylävirasto aloittaa otsikon mukaisen ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `,
        `RUOTSIKSI Väylävirasto aloittaa otsikon mukaisen ${this.projektiTyyppi}n laatimisen tarpeellisine tutkimuksineen. `,
      ]),

      this.hankkeenKuvaus(),

      this.localizedParagraph([
        `Väylävirasto on julkaissut kuulutuksen suunnittelun aloittamisesta ja maastotutkimuksista. Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisemisesta. (ratalaki 95 §, HL 62 a §) `,
        `RUOTSIKSI Väylävirasto on julkaissut kuulutuksen suunnittelun aloittamisesta ja maastotutkimuksista. Asianosaisten katsotaan saaneen tiedon suunnittelun käynnistymisestä ja tutkimusoikeudesta seitsemäntenä päivänä kuulutuksen julkaisemisesta. (ratalaki 95 §, HL 62 a §) `,
      ]),

      this.localizedParagraph([
        "Rataverkon haltijalla on oikeus tehdä suunnittelualueeseen kuuluvalla kiinteistöllä suunnitteluun liittyviä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (ratalaki 9 §). ",
        "RUOTSIKSI Rataverkon haltijalla on oikeus tehdä suunnittelualueeseen kuuluvalla kiinteistöllä suunnitteluun liittyviä mittauksia, maaperätutkimuksia ja muita valmistelevia toimenpiteitä (ratalaki 9 §). ",
      ]),

      this.localizedParagraph([
        "Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (ratalaki 22 § ja 9 §). ",
        "RUOTSIKSI Kiinteistön omistajilla ja muilla asianosaisilla sekä niillä, joiden asumiseen, työntekoon tai muihin oloihin suunnitelma saattaa vaikuttaa on oikeus olla tutkimuksissa saapuvilla ja lausua mielipiteensä asiassa (ratalaki 22 § ja 9 §). ",
      ]),

      this.localizedParagraph([
        "Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta. Valmistuttuaan suunnitelma asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta. (ratalaki 22 §). ",
        "RUOTSIKSI Suunnittelun edetessä tullaan myöhemmin erikseen ilmoitettavalla tavalla varaamaan tilaisuus mielipiteen ilmaisemiseen suunnitelmasta. Valmistuttuaan suunnitelma asetetaan yleisesti nähtäville, jolloin asianosaisilla on mahdollisuus tehdä kirjallinen muistutus suunnitelmasta. (ratalaki 22 §). ",
      ]),

      this.vaylavirastoTietosuojaParagraph(),
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
}
