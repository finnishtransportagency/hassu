import { DBProjekti, Vuorovaikutus } from "../../database/model";
import { Kieli } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { EmailOptions } from "../../email/email";
import { KutsuAdapter } from "./KutsuAdapter";

export class Kutsu21 {
  private readonly adapter: KutsuAdapter;
  private readonly kieli: Kieli;

  constructor(projekti: DBProjekti, vuorovaikutus: Vuorovaikutus, kieli: Kieli, asiakirjanMuoto: AsiakirjanMuoto) {
    if (!(projekti.velho && projekti.velho.tyyppi && projekti.kielitiedot && projekti.suunnitteluVaihe)) {
      throw new Error("Projektilta puuttuu tietoja!");
    }
    this.kieli = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
    this.adapter = new KutsuAdapter({
      oid: projekti.oid,
      kielitiedot: projekti.kielitiedot,
      velho: projekti.velho,
      kieli: this.kieli,
      asiakirjanMuoto,
      projektiTyyppi: projekti.velho.tyyppi,
      vuorovaikutus,
      kayttoOikeudet: projekti.kayttoOikeudet,
    });
  }

  createEmail(): EmailOptions {
    const body = [
      this.adapter.title,
      "",

      this.adapter.tilaajaOrganisaatio +
        this.adapter.selectText(" laatii liikennejärjestelmästä ja maanteistä annetun lain (LjMTL, 503/2005) mukaista ") +
        this.adapter.suunnitelmaa +
        " " +
        this.adapter.nimi +
        ".",
      "",
      this.adapter.tilaajaOrganisaatio +
        " ilmoittaa, että se julkaisee tietoverkossaan kutsun, joka koskee otsikossa mainitun " +
        this.adapter.suunnitelman +
        " yleisötilaisuutta (laki liikennejärjestelmästä ja maanteistä 27 §).",
      "",
      this.adapter.selectText(
        `Kutsu julkaistaan ${this.adapter.vuorovaikutusJulkaisuPvm} ${this.adapter.tilaajaGenetiivi} tietoverkossa osoitteessa ${this.adapter.kutsuUrl} sekä yhdessä tai useammassa alueella yleisesti ilmestyvässä sanomalehdessä.`
      ),
      "",
      this.adapter.tilaajaOrganisaatio +
        " pyytää " +
        this.adapter.kuntia +
        " ja " +
        this.adapter.tilaajaOrganisaatiota +
        " julkaisemaan liitteenä olevan kutsun tietoverkossaan. Kutsu tulee julkaista tietoverkossa mahdollisuuksien mukaan edellä mainittuna kutsun julkaisupäivänä. Kutsun julkaisemista ei tarvitse todentaa " +
        this.adapter.tilaajaOrganisaatiolle +
        ".",
      "",
      this.adapter.tilaajaOrganisaatio +
        " käsittelee " +
        this.adapter.suunnitelman +
        " laatimiseen liittyen tarpeellisia henkilötietoja. Lisätietoja väyläsuunnittelun tietosuojakäytänteistä on saatavilla verkkosivujen tietosuojaosiossa osoitteessa " +
        this.adapter.tietosuojaurl +
        ".",
      "",
      "Lisätietoja antaa:",
      this.adapter.yhteystiedotVuorovaikutus
        .map(
          ({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) =>
            `${organisaatio}, ${etunimi} ${sukunimi}, puhelin ${puhelinnumero} ja sähköposti ${sahkoposti}.`
        )
        .join("\n"),
      "",
      "LIITTEET	Kutsu tiedotus-/yleisötilaisuuteen (20T)",
    ].join("\n");

    return { subject: this.adapter.subject, text: body };
  }
}
