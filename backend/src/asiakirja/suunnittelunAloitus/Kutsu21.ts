import { Kieli } from "../../../../common/graphql/apiModel";
import { EmailOptions } from "../../email/email";
import { YleisotilaisuusKutsuPdfOptions } from "../asiakirjaTypes";
import { formatNimi } from "../../util/userUtil";
import { ASIAKIRJA_KUTSU_PREFIX, SuunnitteluVaiheKutsuAdapter } from "../adapter/suunnitteluVaiheKutsuAdapter";

export class Kutsu21 {
  private readonly adapter: SuunnitteluVaiheKutsuAdapter;
  private readonly kieli: Kieli;

  constructor({ oid, velho, kayttoOikeudet, kielitiedot, vuorovaikutusKierrosJulkaisu, kieli }: YleisotilaisuusKutsuPdfOptions) {
    if (!(velho && velho.tyyppi && kielitiedot && vuorovaikutusKierrosJulkaisu)) {
      throw new Error("Projektilta puuttuu tietoja!");
    }
    this.kieli = kieli == Kieli.SAAME ? Kieli.SUOMI : kieli;
    this.adapter = new SuunnitteluVaiheKutsuAdapter({
      oid,
      kielitiedot,
      velho,
      kieli: this.kieli,
      kayttoOikeudet,
      vuorovaikutusKierrosJulkaisu,
      hankkeenKuvaus: vuorovaikutusKierrosJulkaisu.hankkeenKuvaus,
    });
  }

  createEmail(): EmailOptions {
    const body = [
      this.adapter.title,
      "",

      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "ilmoitus_kappale1"),
      "",
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "ilmoitus_kappale2"),
      "",
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "ilmoitus_kappale3"),
      "",
      this.adapter.hankkeenKuvaus(),
      "",
      this.adapter.text("asiakirja.tietosuoja"),
      "",
      this.adapter.text("lisatietoja_antavat.one") + ":",
      this.adapter.yhteystiedotVuorovaikutus
        .map(
          ({ organisaatio, etunimi, sukunimi, puhelinnumero, sahkoposti }) =>
            `${organisaatio}, ${formatNimi({ etunimi, sukunimi })}, ${puhelinnumero}, ${sahkoposti}.`
        )
        .join("\n"),
      "",
      "Liite: Kutsu vuorovaikutukseen",
    ].join("\n");

    return { subject: this.adapter.subject, text: body };
  }
}
