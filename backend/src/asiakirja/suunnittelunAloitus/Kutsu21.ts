import { YleisotilaisuusKutsuPdfOptions } from "../asiakirjaTypes";
import { formatNimi } from "../../util/userUtil";
import { ASIAKIRJA_KUTSU_PREFIX, SuunnitteluVaiheKutsuAdapter } from "../adapter/suunnitteluVaiheKutsuAdapter";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { SuunnitteluSopimusJulkaisu } from "../../database/model";
import { assertIsDefined } from "../../util/assertions";
import { adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu } from "../../projekti/adapter/common/adaptSuunnitteluSopimusToJulkaisu";
import { findUserByKayttajatunnus } from "../../projekti/projektiUtil";
import { EmailOptions } from "../../email/model/emailOptions";
import { isEvkAktivoitu } from "hassu-common/util/isEvkAktivoitu";

export class Kutsu21 {
  private readonly adapter: SuunnitteluVaiheKutsuAdapter;
  private readonly kieli: KaannettavaKieli;

  constructor({
    oid,
    lyhytOsoite,
    velho,
    kayttoOikeudet,
    kielitiedot,
    vuorovaikutusKierrosJulkaisu,
    kieli,
    suunnitteluSopimus,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
    kuulutettuYhdessaSuunnitelmanimi,
  }: YleisotilaisuusKutsuPdfOptions) {
    if (!(velho.tyyppi && kielitiedot && vuorovaikutusKierrosJulkaisu)) {
      throw new Error("Projektilta puuttuu tietoja!");
    }
    this.kieli = kieli;

    let suunnitteluSopimusJulkaisu: SuunnitteluSopimusJulkaisu | undefined | null;
    if (suunnitteluSopimus) {
      assertIsDefined(kayttoOikeudet);

      if (suunnitteluSopimus?.yhteysHenkilo) {
        suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(
          oid,
          suunnitteluSopimus,
          findUserByKayttajatunnus(kayttoOikeudet, suunnitteluSopimus.yhteysHenkilo)
        );
      } else {
        suunnitteluSopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(oid, suunnitteluSopimus, undefined);
      }
    }

    this.adapter = new SuunnitteluVaiheKutsuAdapter({
      oid,
      lyhytOsoite,
      kielitiedot,
      velho,
      kieli: this.kieli,
      kayttoOikeudet,
      vuorovaikutusKierrosJulkaisu,
      hankkeenKuvaus: vuorovaikutusKierrosJulkaisu.hankkeenKuvaus,
      suunnitteluSopimus: suunnitteluSopimusJulkaisu ?? undefined,
      asianhallintaPaalla,
      linkkiAsianhallintaan,
      kuulutettuYhdessaSuunnitelmanimi,
    });
  }

  isUseitaOsapuolia(): boolean {
    return this.adapter.isUseitaOsapuolia();
  }

  createEmail(): EmailOptions {
    const usePlural = this.isUseitaOsapuolia();
    const isEvkAktiivinen = isEvkAktivoitu();
    const bodyArray = [this.adapter.title, ""];
    if (this.adapter.selosteVuorovaikutuskierrokselle) {
      bodyArray.push(this.adapter.selosteVuorovaikutuskierrokselle, "");
    }
    bodyArray.push(
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "ilmoitus_kappale1", usePlural),
      "",
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "ilmoitus_kappale2"),
      "",
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + `ilmoitus_kappale3${isEvkAktiivinen ? "" : "_ely"}`),
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
      this.adapter.text(ASIAKIRJA_KUTSU_PREFIX + "liite_kutsu")
    );
    const body = bodyArray.join("\n");

    return { subject: this.adapter.subject, text: body };
  }
}
