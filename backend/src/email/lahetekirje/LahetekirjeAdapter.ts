import log from "loglevel";
import { Kieli, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, Velho } from "../../database/model";
import { translate } from "../../util/localization";
import { AsiakirjanMuoto, determineAsiakirjaMuoto } from "../../asiakirja/asiakirjaTypes";
import assert from "assert";
import { formatNimi } from "../../util/userUtil";

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
  selosteLahetekirjeeseen?: string;
}

export class LahetekirjeAdapter {
  private readonly velho: Velho;
  private readonly aloitusKuulutus: AloitusKuulutusJulkaisu;

  constructor(aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu) {
    this.velho = aloitusKuulutusJulkaisu.velho;
    this.aloitusKuulutus = aloitusKuulutusJulkaisu;
  }

  public get lahetekirjeTiedot(): LahetekirjeTiedot {
    const velho = this.velho;
    assert(velho);
    return {
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
      asiakirjanMuoto: determineAsiakirjaMuoto(velho.tyyppi, velho.vaylamuoto),
      selosteLahetekirjeeseen: this.aloitusKuulutus?.uudelleenKuulutus?.selosteLahetekirjeeseen?.SUOMI,
    };
  }

  protected get isVaylaTilaaja(): boolean {
    return this.velho?.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO;
  }

  protected get isElyTilaaja(): boolean {
    return !!this.velho?.suunnittelustaVastaavaViranomainen && this.velho?.suunnittelustaVastaavaViranomainen.endsWith("ELY");
  }

  private get suunnitelmaTyyppi(): SuunnitelmaTyyppi {
    let result: SuunnitelmaTyyppi = "yleissuunnitelma";
    switch (this.velho?.tyyppi) {
      case ProjektiTyyppi.RATA:
        result = "ratasuunnitelma";
        break;
      case ProjektiTyyppi.TIE:
        result = "tiesuunnitelma";
        break;
      case ProjektiTyyppi.YLEINEN:
        result = "yleissuunnitelma";
        break;
    }
    return result;
  }

  private get nimi() {
    return this.velho?.nimi || "<PROJEKTIN NIMI>";
  }

  private get tilaajaPitka() {
    let result = "<TILAAJA>";
    const viranomainen = this.velho?.suunnittelustaVastaavaViranomainen;
    // if no tilaajaOrganisaatio return a placeholder
    if (!viranomainen) {
      return result;
    }

    const tilaajaOrganisaatio: string = translate("viranomainen." + viranomainen, Kieli.SUOMI) || "";
    if (!tilaajaOrganisaatio) {
      throw new Error(`Ei kaannosta viranomainen.${viranomainen}:lle`);
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
    const pvm = this.aloitusKuulutus?.kuulutusPaiva;
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
    const viranomainen = this.velho?.suunnittelustaVastaavaViranomainen;
    // if no tilaajaOrganisaatio return a placeholder
    if (!viranomainen) {
      return result;
    }

    if (this.isVaylaTilaaja) {
      result = "Väyläviraston";
    } else if (this.isElyTilaaja) {
      result = "ELY-keskuksen";
    } else {
      const kaannos: string = translate("viranomainen." + viranomainen, Kieli.SUOMI) || "";
      if (!kaannos) {
        throw new Error(`Ei kaannosta viranomainen.${viranomainen}:lle`);
      }
      result = kaannos;
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
    const viranomainen = this.velho?.suunnittelustaVastaavaViranomainen;
    // if no tilaajaOrganisaatio return a placeholder
    if (!viranomainen) {
      return result;
    }

    if (this.isElyTilaaja) {
      result = "ELY-keskus";
    } else {
      const kaannos: string = translate("viranomainen." + viranomainen, Kieli.SUOMI) || "";
      if (!kaannos) {
        throw new Error(`Ei kaannosta viranomainen.${viranomainen}:lle`);
      }
      result = kaannos;
    }
    return result;
  }

  private get hankkeenKuvaus() {
    return this.aloitusKuulutus?.hankkeenKuvaus?.SUOMI || "<HANKKEEN KUVAUS>";
  }

  private get tilaajaAllatiivi() {
    let result = "<TILAAJA>";
    const viranomainen = this.velho?.suunnittelustaVastaavaViranomainen;
    // if no tilaajaOrganisaatio return a placeholder
    if (!viranomainen) {
      return result;
    }

    if (this.isVaylaTilaaja) {
      result = "Väylävirastolle";
    } else if (this.isElyTilaaja) {
      result = "ELY-keskukselle";
    } else {
      const kaannos: string = translate("viranomainen." + viranomainen, Kieli.SUOMI) || "";
      if (!kaannos) {
        throw new Error(`Ei kaannosta viranomainen.${viranomainen}:lle`);
      }
      result = kaannos;
    }
    return result;
  }

  private get yhteystiedot() {
    return this.aloitusKuulutus?.yhteystiedot.map((y) => `${y.organisaatio}, ${formatNimi(y)}, puh. ${y.puhelinnumero}, ${y.sahkoposti}`);
  }

  private get vastaanottajat(): string[] {
    const result: string[] = [];
    const kunnat = this.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat;
    const viranomaiset = this.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset;
    kunnat?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    viranomaiset?.forEach(({ sahkoposti }) => {
      result.push(sahkoposti);
    });
    return result;
  }
}
