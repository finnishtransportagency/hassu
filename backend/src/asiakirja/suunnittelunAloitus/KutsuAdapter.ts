import { Kieli, ProjektiRooli, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";
import { DBVaylaUser, Kielitiedot, SuunnitteluSopimus, Velho, Vuorovaikutus, Yhteystieto } from "../../database/model";
import { AsiakirjanMuoto } from "../asiakirjaService";
import { translate } from "../../util/localization";
import { linkSuunnitteluVaihe } from "../../../../common/links";
import { formatProperNoun } from "../../../../common/util/formatProperNoun";

export type KutsuAdapterProps = {
  oid?: string;
  velho: Velho;
  kielitiedot: Kielitiedot;
  kieli: Kieli;
  asiakirjanMuoto: AsiakirjanMuoto;
  projektiTyyppi: ProjektiTyyppi;
  vuorovaikutus?: Vuorovaikutus;
  kayttoOikeudet?: DBVaylaUser[];
};

const yhteystietoMapper = ({
  sukunimi,
  etunimi,
  organisaatio,
  puhelinnumero,
  sahkoposti,
  titteli,
}): { organisaatio; etunimi; sukunimi; puhelinnumero; sahkoposti; titteli } => ({
  etunimi: formatProperNoun(etunimi),
  sukunimi: formatProperNoun(sukunimi),
  organisaatio: formatProperNoun(organisaatio),
  puhelinnumero,
  sahkoposti,
  titteli,
});

export class KutsuAdapter {
  private readonly velho: Velho;
  private readonly kieli: Kieli;
  private readonly asiakirjanMuoto: AsiakirjanMuoto;
  private readonly oid?: string;
  private readonly projektiTyyppi: ProjektiTyyppi;
  private readonly vuorovaikutus?: Vuorovaikutus;
  private kayttoOikeudet?: DBVaylaUser[];
  private readonly kielitiedot: Kielitiedot;

  constructor({
    oid,
    velho,
    kielitiedot,
    asiakirjanMuoto,
    kieli,
    projektiTyyppi,
    vuorovaikutus,
    kayttoOikeudet,
  }: KutsuAdapterProps) {
    this.oid = oid;
    this.velho = velho;
    this.kielitiedot = kielitiedot;
    this.kieli = kieli;
    this.asiakirjanMuoto = asiakirjanMuoto;
    this.projektiTyyppi = projektiTyyppi;
    this.vuorovaikutus = vuorovaikutus;
    this.kayttoOikeudet = kayttoOikeudet;
  }

  get title(): string {
    return [this.nimi + this.kuntaOrKunnat].join(", ");
  }

  get subject(): string {
    return {
      [AsiakirjanMuoto.TIE]: "SUUNNITELMAN LAATIJAN KUTSUSTA YLEISÖTILAISUUTEEN ILMOITTAMINEN",
      [AsiakirjanMuoto.RATA]: "",
    }[this.asiakirjanMuoto];
  }

  get tilaajaOrganisaatio(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return (
      translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli) ||
      "<Suunnittelusta vastaavan viranomaisen tieto puuttuu>"
    );
  }

  get tilaajaOrganisaatiota(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli)
      .replace("keskus", "keskusta")
      .replace("virasto", "virastoa");
  }

  get tilaajaOrganisaatiolle(): string {
    const suunnittelustaVastaavaViranomainen = this.velho.suunnittelustaVastaavaViranomainen;
    return translate("viranomainen." + suunnittelustaVastaavaViranomainen, this.kieli)
      .replace("keskus", "keskukselle")
      .replace("virasto", "virastolle");
  }

  static tilaajaOrganisaatioForViranomainen(viranomainen: Viranomainen | null, kieli: Kieli): string {
    return translate("viranomainen." + viranomainen, kieli) || "<Tilaajaorganisaation tieto puuttuu>";
  }

  get tilaajaGenetiivi(): string {
    const tilaajaOrganisaatio = this.tilaajaOrganisaatio;
    if (this.velho.suunnittelustaVastaavaViranomainen == Viranomainen.MUU) {
      return "tilaajaorganisaation";
    }
    if (this.velho.suunnittelustaVastaavaViranomainen == Viranomainen.VAYLAVIRASTO) {
      if (this.kieli == "SUOMI") {
        return "väyläviraston";
      }
      return "trafikledsverkets";
    }
    return tilaajaOrganisaatio.replace("keskus", "keskuksen");
  }

  get kuntaOrKunnat(): string {
    const kunnat = this.velho?.kunnat;
    if (kunnat) {
      return ", " + formatList(kunnat, this.kieli);
    }
    return "";
  }

  get kuntia(): string {
    const kunnat = this.velho?.kunnat;
    if (kunnat) {
      return kunnat.join(", ");
    }
    return "";
  }

  get suunnitelmaa(): string {
    if (this.kieli == Kieli.SUOMI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "yleissuunnitelmaa",
        [ProjektiTyyppi.TIE]: "tiesuunnitelmaa",
        [ProjektiTyyppi.RATA]: "ratasuunnitelmaa",
      }[this.projektiTyyppi];
    } else if (this.kieli == Kieli.RUOTSI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "utredningsplanen",
        [ProjektiTyyppi.TIE]: "vägplanen",
        [ProjektiTyyppi.RATA]: "järnvägsplanen",
      }[this.projektiTyyppi];
    }
  }

  get suunnitelman(): string {
    if (this.kieli == Kieli.SUOMI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "yleissuunnitelman",
        [ProjektiTyyppi.TIE]: "tiesuunnitelman",
        [ProjektiTyyppi.RATA]: "ratasuunnitelman",
      }[this.projektiTyyppi];
    } else if (this.kieli == Kieli.RUOTSI) {
      return {
        [ProjektiTyyppi.YLEINEN]: "utredningsplanen",
        [ProjektiTyyppi.TIE]: "vägplanen",
        [ProjektiTyyppi.RATA]: "järnvägsplanen",
      }[this.projektiTyyppi];
    }
  }

  get nimi(): string {
    if (isKieliSupported(this.kieli, this.kielitiedot)) {
      if (this.kieli == Kieli.SUOMI) {
        return this.velho.nimi;
      } else {
        return this.kielitiedot.projektinNimiVieraskielella;
      }
    }
    throw new Error("Pyydettyä kieliversiota ei ole saatavilla");
  }

  get vuorovaikutusJulkaisuPvm(): string {
    return new Date(this.vuorovaikutus.vuorovaikutusJulkaisuPaiva).toLocaleDateString("fi");
  }

  get kutsuUrl(): string {
    return linkSuunnitteluVaihe(this.oid);
  }

  get tietosuojaUrl(): string {
    return this.selectText(
      "https://www.vayla.fi/tietosuoja",
      "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy",
      "https://www.vayla.fi/tietosuoja"
    );
  }

  get asianumero(): string {
    return this.velho.asiatunnusVayla || this.velho.asiatunnusELY;
  }

  selectText(suomi: string, ruotsi?: string, saame?: string): string {
    if (this.kieli == Kieli.SUOMI && suomi) {
      return suomi;
    } else if (this.kieli == Kieli.RUOTSI && ruotsi) {
      return ruotsi;
    } else if (this.kieli == Kieli.SAAME && saame) {
      return saame;
    }
    return "<" + this.kieli + suomi + this.kieli + ">";
  }

  yhteystiedot(
    yhteystiedot: Yhteystieto[],
    suunnitteluSopimus?: SuunnitteluSopimus,
    yhteysHenkilot?: string[]
  ): { organisaatio; etunimi; sukunimi; puhelinnumero; sahkoposti; titteli }[] {
    let yt: Yhteystieto[] = [];
    if (yhteystiedot) {
      yt = yt.concat(yhteystiedot);
    }
    if (yhteysHenkilot) {
      if (!this.kayttoOikeudet) {
        throw new Error("BUG: Kayttöoikeudet pitää antaa jos yhteyshenkilöt on annettu.");
      }
      this.getUsersForUsernames(yhteysHenkilot).forEach((user) => {
        const [sukunimi, etunimi] = user.nimi.split(/, /g);
        yt.push({
          etunimi,
          sukunimi,
          organisaatio: user.organisaatio,
          sahkoposti: user.email,
          puhelinnumero: user.puhelinnumero,
        });
      });
    }
    if (suunnitteluSopimus) {
      const { email, puhelinnumero, sukunimi, etunimi, kunta } = suunnitteluSopimus;
      yt.push({
        etunimi,
        sukunimi,
        puhelinnumero,
        sahkoposti: email,
        organisaatio: kunta,
      });
    }
    return yt.map(yhteystietoMapper);
  }

  get yhteystiedotVuorovaikutus(): { organisaatio; etunimi; sukunimi; puhelinnumero; sahkoposti }[] {
    return this.yhteystiedot(
      this.vuorovaikutus?.esitettavatYhteystiedot || [],
      undefined,
      this.vuorovaikutus?.vuorovaikutusYhteysHenkilot
    );
  }

  private getUsersForUsernames(usernames?: string[]): DBVaylaUser[] | undefined {
    return usernames
      ?.map((kayttajatunnus) =>
        this.kayttoOikeudet
          .filter(
            (kayttaja) => kayttaja.kayttajatunnus == kayttajatunnus || kayttaja.rooli == ProjektiRooli.PROJEKTIPAALLIKKO
          )
          .pop()
      )
      .filter((o) => o);
  }
}

function isKieliSupported(kieli: Kieli, kielitiedot: Kielitiedot) {
  return kielitiedot.ensisijainenKieli == kieli || kielitiedot.toissijainenKieli == kieli;
}

export const formatList = (words: string[], kieli: Kieli): string => {
  if (words.length == 1) {
    return words[0];
  }
  const lastWord = words.slice(words.length - 1);
  const firstWords = words.slice(0, words.length - 1);
  return firstWords.join(", ") + andInLanguage[kieli] + lastWord;
};

const andInLanguage = { [Kieli.SUOMI]: " ja ", [Kieli.RUOTSI]: " och ", [Kieli.SAAME]: "" };
