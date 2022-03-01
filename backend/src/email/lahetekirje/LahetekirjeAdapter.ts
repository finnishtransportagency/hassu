import log from "loglevel";
import { ProjektiTyyppi } from "../../../../common/graphql/apiModel";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../../asiakirja/asiakirjaService";
import { Yhteystieto } from "../../database/model/projekti";
import { DBProjekti } from "../../database/model/projekti";

type SuunnitelmaTyyppi = "tiesuunnitelma" | "ratasuunnitelma" | "yleissuunnitelma";

export interface LahetekirjeTiedot {
  nimi: string;
  tilaajaPitka: string;
  kuulutuksenSyy: string;
  kuulutusPvm: string;
  tilaajaGenetiivi: string;
  kuulutusUrl: string;
  tietosuojaUrl: string;
  tilaajaLyhyt: string;
  hankkeenKuvaus: string;
  tilaajaAllatiivi: string;
  yhteystiedot: string[];
  vastaanottajat: string[];
  suunnitelmaTyyppi: SuunnitelmaTyyppi;
  asiakirjanMuoto: AsiakirjanMuoto;
}

export class LahetekirjeAdapter {
  private projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  public get lahetekirjeTiedot(): LahetekirjeTiedot {
    const tiedot: LahetekirjeTiedot = {
      nimi: this.nimi,
      tilaajaPitka: this.tilaajaPitka,
      kuulutuksenSyy: this.kuulutuksenSyy,
      kuulutusPvm: this.kuulutusPvm,
      tilaajaGenetiivi: this.tilaajaGenetiivi,
      kuulutusUrl: this.kuulutusUrl,
      tietosuojaUrl: this.tietosuojaUrl,
      tilaajaLyhyt: this.tilaajaLyhyt,
      hankkeenKuvaus: this.hankkeenKuvaus,
      tilaajaAllatiivi: this.tilaajaAllatiivi,
      yhteystiedot: this.yhteystiedot,
      vastaanottajat: this.vastaanottajat,
      suunnitelmaTyyppi: this.suunnitelmaTyyppi,
      asiakirjanMuoto: determineAsiakirjaMuoto(this.projekti.velho.tyyppi, this.projekti.velho.vaylamuoto),
    };
    return tiedot;
  }

  protected get isVaylaTilaaja() {
    return this.projekti?.velho?.tilaajaOrganisaatio === "Väylävirasto";
  }

  protected get isElyTilaaja() {
    return (
      this.projekti?.velho?.tilaajaOrganisaatio && this.projekti?.velho?.tilaajaOrganisaatio.endsWith("ELY-keskus")
    );
  }

  private get suunnitelmaTyyppi(): SuunnitelmaTyyppi {
    let result: SuunnitelmaTyyppi = "yleissuunnitelma";
    switch (this.projekti?.velho?.tyyppi) {
      case ProjektiTyyppi.RATA:
        result = "ratasuunnitelma";
        break;
      case ProjektiTyyppi.TIE:
        result = "tiesuunnitelma";
        break;
    }
    return result;
  }

  private get nimi() {
    return this.projekti?.velho?.nimi || "<PROJEKTIN NIMI>";
  }

  private get tilaajaPitka() {
    let result = "<TILAAJA>";
    const tilaajaOrganisaatio = this.projekti?.velho?.tilaajaOrganisaatio;
    // if no tilaajaOrganisaatio return a placeholder
    if (!tilaajaOrganisaatio) {
      return result;
    }

    if (this.isElyTilaaja) {
      result = tilaajaOrganisaatio.replace("ELY-keskus", "elinkeino-, liikenne- ja ympäristökeskus (ELY-keskus)");
    } else {
      result = tilaajaOrganisaatio;
    }
    return result;
  }

  // TODO Toteuta logiikka kuulutuksen syylle
  private get kuulutuksenSyy() {
    return [
      "suunnittelun ja maastotöiden aloittamista",
      "suunnitelman nähtäville asettamista",
      "suunnitelman hyväksymispäätöstä",
      "päätöksen voimassaoloajan pidentämisestä",
    ][0];
  }

  private get kuulutusPvm() {
    let result = "<KUULUTUS PVM>";
    const pvm = this.projekti?.aloitusKuulutus?.kuulutusPaiva;
    // if no pvm return a placeholder
    if (!pvm) {
      return result;
    }
    try {
      result = new Date(pvm).toLocaleDateString("fi");
    } catch (e) {
      log.log(`Could not convert '${pvm}' to `, e);
    }
    return result;
  }

  private get tilaajaGenetiivi() {
    let result = "<TILAAJA>";
    const tilaajaOrganisaatio = this.projekti?.velho?.tilaajaOrganisaatio;
    // if no tilaajaOrganisaatio return a placeholder
    if (!tilaajaOrganisaatio) {
      return result;
    }

    if (this.isVaylaTilaaja) {
      result = "Väyläviraston";
    } else if (this.isElyTilaaja) {
      result = "ELY-keskuksen";
    } else {
      result = tilaajaOrganisaatio;
    }
    return result;
  }

  private get kuulutusUrl() {
    return this.isVaylaTilaaja ? "https://vayla.fi/kuulutukset" : "https://ely-keskus.fi/kuulutukset";
  }

  private get tietosuojaUrl() {
    return this.isVaylaTilaaja ? "https://vayla.fi/tietosuoja" : "https://ely-keskus.fi/tietosuoja";
  }

  private get tilaajaLyhyt() {
    let result = "<TILAAJA>";
    const tilaajaOrganisaatio = this.projekti?.velho?.tilaajaOrganisaatio;
    // if no tilaajaOrganisaatio return a placeholder
    if (!tilaajaOrganisaatio) {
      return result;
    }

    if (this.isElyTilaaja) {
      result = "ELY-keskus";
    } else {
      result = tilaajaOrganisaatio;
    }
    return result;
  }

  private get hankkeenKuvaus() {
    return this.projekti?.aloitusKuulutus?.hankkeenKuvaus?.SUOMI || "<HANKKEEN KUVAUS>";
  }

  private get tilaajaAllatiivi() {
    let result = "<TILAAJA>";
    const tilaajaOrganisaatio = this.projekti?.velho?.tilaajaOrganisaatio;
    // if no tilaajaOrganisaatio return a placeholder
    if (!tilaajaOrganisaatio) {
      return result;
    }

    if (this.isVaylaTilaaja) {
      result = "Väylävirastolle";
    } else if (this.isElyTilaaja) {
      result = "ELY-keskukselle";
    } else {
      result = tilaajaOrganisaatio;
    }
    return result;
  }

  private get yhteystiedot() {
    const esitettavatYhteystiedot = this.projekti?.aloitusKuulutus?.esitettavatYhteystiedot;
    const kayttoOikeudet = this.projekti?.kayttoOikeudet;
    const yt: Yhteystieto[] = [];
    kayttoOikeudet
      ?.filter(({ esitetaanKuulutuksessa }) => !!esitetaanKuulutuksessa)
      ?.forEach((oikeus) => {
        const [sukunimi, etunimi] = oikeus.nimi.split(/, /g);
        yt.push({
          etunimi,
          sukunimi,
          puhelinnumero: oikeus.puhelinnumero,
          sahkoposti: oikeus.email,
          organisaatio: oikeus.organisaatio,
        });
      });
    esitettavatYhteystiedot?.forEach((yhteystieto) => {
      yt.push(yhteystieto);
    });
    return yt.map((y) => `${y.organisaatio}, ${y.etunimi} ${y.sukunimi}, puh. ${y.puhelinnumero}, ${y.sahkoposti} `);
  }

  private get vastaanottajat() {
    const result = [];
    const kunnat = this.projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat;
    const viranomaiset = this.projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset;
    kunnat?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    viranomaiset?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    return result;
  }
}
