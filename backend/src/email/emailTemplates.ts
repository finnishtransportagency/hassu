import get from "lodash/get";
import { Kayttaja, KayttajaTyyppi, Kieli, PalveluPalauteInput, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { config } from "../config";
import { DBProjekti, DBVaylaUser, Muistutus } from "../database/model";
import { linkSuunnitteluVaiheYllapito } from "hassu-common/links";
import {
  findHyvaksymisPaatosVaiheWaitingForApproval,
  findJatkoPaatos1VaiheWaitingForApproval,
  findJatkoPaatos2VaiheWaitingForApproval,
  findNahtavillaoloWaitingForApproval,
  getAsiatunnus,
} from "../projekti/projektiUtil";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { assertIsDefined } from "../util/assertions";
import { HyvaksymisPaatosVaiheKutsuAdapter } from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { NahtavillaoloVaiheKutsuAdapter } from "../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { EmailOptions } from "./model/emailOptions";

export function template(strs: TemplateStringsArray, ...exprs: string[]) {
  return function (obj: unknown): string {
    const result = [strs[0]];
    exprs.forEach(function (key, i) {
      const value = get(obj, key);
      result.push(value, strs[i + 1]);
    });
    return result.join("");
  };
}

const domain = config.frontendDomainName || "vayliensuunnittelu.fi";
// Projektin perustaminen
const perustamisOtsikko = template`Valtion liikenneväylien suunnittelu: Uusi projekti perustettu ${"asiatunnus"}`;
const perustamisTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmään on tuotu Projektivelhosta projektisi:
${"velho.nimi"}

Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvaksymispyynto
const kuulutusHyvaksyttavanaOtsikko = template`Valtion liikenneväylien suunnittelu: ${"kuulutusTyyppiUpperCase"}kuulutus odottaa hyväksyntää ${"asiatunnus"}`;
const kuulutusHyvaksyttavanaTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektistasi
${"velho.nimi"}
on luotu ${"kuulutusTyyppiLowerCase"}kuulutus, ${"kuulutusKohde"} hyväksyntääsi.

Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}${"kuulutusPath"}

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen ilmoitus laatijalle
const aloituskuulutusHyvaksyttyOtsikko = "Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty {{asiatunnus}}";
const aloituskuulutusHyvaksyttyTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektin
{{nimi}}
aloituskuulutus on hyväksytty.

Voit tarkastella aloituskuulutusta osoitteessa {{aloituskuulutusYllapitoUrl}}

Sait tämän viestin, koska sinut on merkitty aloituskuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const hyvaksymispaatosHyvaksyttyLaatijalleOtsikko =
  "Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus hyväksytty {{asiatunnus}}";
const hyvaksymispaatosHyvaksyttyLaatijalleTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektin
{{nimi}}
hyväksymispäätöskuulutus on hyväksytty.

Voit tarkastella hyväksymispäätöskuulutusta osoitteessa {{paatosYllapitoUrl}}

Sait tämän viestin, koska sinut on merkitty hyväksymispäätöskuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const jatkopaatosHyvaksyttyLaatijalleOtsikko = "Valtion liikenneväylien suunnittelu: Jatkopäätöskuulutus hyväksytty {{asiatunnus}}";
const jatkopaatosHyvaksyttyLaatijalleTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektin
{{nimi}}
jatkopäätöskuulutus on hyväksytty.

Voit tarkastella hyväksymispäätöskuulutusta osoitteessa {{hyvaksymispaatosYllapitoUrl}}

Sait tämän viestin, koska sinut on merkitty hyväksymispäätöskuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen pdf projektipaallikolle
// Aloituskuulutuksen hyväksyminen pdf projektipaallikolle
const aloituskuulutusHyvaksyttyPDFOtsikko = `Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty {{asiatunnus}}`;
const aloituskuulutusHyvaksyttyPDFTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektisi
{{nimi}}
aloituskuulutus on hyväksytty.

Voit tarkastella projektia osoitteessa {{aloituskuulutusYllapitoUrl}}

Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;

// Nähtävilläolovaihekuulutuksen hyväksyminen pdf projektipaallikolle
const nahtavillaolovaihekuulutusHyvaksyttyPDFOtsikko = `Valtion liikenneväylien suunnittelu: Nähtävillaolokuulutus hyväksytty {{asiatunnus}}`;
const nahtavillaolovaihekuulutusHyvaksyttyPDFTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektisi {{nimi}}
nähtävillaolokuulutus on hyväksytty.

Voit tarkastella projektia osoitteessa {{nahtavillaoloYllapitoUrl}}

Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;

const hyvaksymispaatosHyvaksyttyPaallikolleOtsikko = `Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus hyväksytty {{asiatunnus}}`;
const hyvaksymispaatosHyvaksyttyPaallikolleTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektisi {{nimi}} hyväksymispäätöskuulutus on hyväksytty.

Voit tarkastella projektia osoitteessa {{hyvaksymispaatosYllapitoUrl}}

Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const jatkopaatosHyvaksyttyPaallikolleOtsikko = `Valtion liikenneväylien suunnittelu: Jatkopäätöskuulutus hyväksytty {{asiatunnus}}`;
const jatkopaatosHyvaksyttyPaallikolleTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektisi {{nimi}} jatkopäätöskuulutus on hyväksytty.

Voit tarkastella projektia osoitteessa {{paatosYllapitoUrl}}

Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.

Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const uudelleenkuulutusOtsikkoPrefix = `Korjaus/uudelleenkuulutus: `;
const hyvaksymispaatosHyvaksyttyViranomaisilleOtsikko = `{{viranomaisen}} kuulutuksesta ilmoittaminen`;
const hyvaksymispaatosHyvaksyttyViranomaisilleTekstiOsa1 = `Hei,`;
const hyvaksymispaatosHyvaksyttyViranomaisilleTekstiOsa2 = `Liitteenä on {{viranomaisen}} ilmoitus Liikenne- ja viestintävirasto Traficomin tekemästä hyväksymispäätöksestä koskien suunnitelmaa {{nimi}} sekä ilmoitus kuulutuksesta.

Pyydämme suunnittelualueen kuntia julkaisemaan liitteenä olevan ilmoituksen kuulutuksesta verkkosivuillaan.


Ystävällisin terveisin

{{projektipaallikkoNimi}}

{{projektipaallikkoOrganisaatio}}`;

const jatkopaatosHyvaksyttyViranomaisilleTekstiOsa = `Liitteenä on {{viranomaisen}} ilmoitus Liikenne- ja viestintävirasto Traficomin tekemästä hyväksymispäätöksen voimassa olon pidentämistä koskevasta päätöksestä koskien suunnitelmaa {{nimi}} sekä ilmoitus kuulutuksesta.

Pyydämme suunnittelualueen kuntia julkaisemaan liitteenä olevan ilmoituksen kuulutuksesta verkkosivuillaan.


Ystävällisin terveisin

{{projektipaallikkoNimi}}

{{projektipaallikkoOrganisaatio}}`;

const muistutusTeksti = template`
Muistutus vastaanotettu
${"vastaanotettu"}

Nimi
${"etunimi"} ${"sukunimi"}

Postiosoite
${"katuosoite"} ${"postinumeroJaPostitoimipaikka"}

Sähköposti
${"sahkoposti"}

Puhelinnumero
${"puhelinnumero"}

Suunnitelman asiatunnus
${"asiatunnus"}

Muistutus
${"muistutus"}
`;
const muistutusOtsikko = template`Muistutus - ${"id"}`;
const muistuttajanOtsikko = template`Vahvistus muistutuksen jättämisestä Valtion liikenneväylien suunnittelu -järjestelmän kautta`;
const palveluPalauteTeksti = template`Kansalaiskäyttäjä on antanut palvelusta palautetta.

Arvosana: ${"arvosana"}

Kehitysehdotus: ${"kehitysehdotus"}
`;

export function projektiPaallikkoJaVarahenkilotEmails(kayttoOikeudet: DBVaylaUser[]): string[] {
  return kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO || user.tyyppi == KayttajaTyyppi.VARAHENKILO)
    .map((user) => user.email);
}

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  return {
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
    subject: perustamisOtsikko({ asiatunnus, ...projekti }),
    text: perustamisTeksti({ domain, asiatunnus, ...projekti }),
  };
}

function getKuulutusTyyppi(tilasiirtymaTyyppi: TilasiirtymaTyyppi): string {
  switch (tilasiirtymaTyyppi) {
    case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
      return "Aloitus";
    case TilasiirtymaTyyppi.NAHTAVILLAOLO:
      return "Nähtävilläolo";
    case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
      return "Hyväksymispäätös";
    case TilasiirtymaTyyppi.JATKOPAATOS_1:
      return "Jatkopäätös";
    case TilasiirtymaTyyppi.JATKOPAATOS_2:
      return "Jatkopäätös";
    default:
      throw new Error(`TilasiirtymaTyyppi ('${tilasiirtymaTyyppi}') ei ole tuettu hyväksyttävänä emailin lähetyksessä`);
  }
}

function getKuulutusPath(tilasiirtymaTyyppi: TilasiirtymaTyyppi): string {
  switch (tilasiirtymaTyyppi) {
    case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
      return "/aloituskuulutus";
    case TilasiirtymaTyyppi.NAHTAVILLAOLO:
      return "/nahtavillaolo/kuulutus";
    case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
      return "/hyvaksymispaatos/kuulutus";
    case TilasiirtymaTyyppi.JATKOPAATOS_1:
      return "/jatkaminen1/kuulutus";
    case TilasiirtymaTyyppi.JATKOPAATOS_2:
      return "/jatkaminen2/kuulutus";
    default:
      throw new Error(`TilasiirtymaTyyppi ('${tilasiirtymaTyyppi}') ei ole tuettu hyväksyttävänä emailin lähetyksessä`);
  }
}

function getKuulutusKohde(projekti: DBProjekti, tilasiirtymaTyyppi: TilasiirtymaTyyppi): string {
  const aineistotOdottavat = "jonka muokatut aineistot odottavat";
  const jokaOdottaa = "joka odottaa";
  switch (tilasiirtymaTyyppi) {
    case TilasiirtymaTyyppi.NAHTAVILLAOLO:
      if (findNahtavillaoloWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
      break;
    case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
      if (findHyvaksymisPaatosVaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
      break;
    case TilasiirtymaTyyppi.JATKOPAATOS_1:
      if (findJatkoPaatos1VaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
      break;
    case TilasiirtymaTyyppi.JATKOPAATOS_2:
      if (findJatkoPaatos2VaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
      break;
    default:
      return jokaOdottaa;
  }
}

export function createKuulutusHyvaksyttavanaEmail(projekti: DBProjekti, tilasiirtymaTyyppi: TilasiirtymaTyyppi): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  const kuulutusTyyppiUpperCase = getKuulutusTyyppi(tilasiirtymaTyyppi);
  const kuulutusTyyppiLowerCase = kuulutusTyyppiUpperCase.toLowerCase();
  const kuulutusKohde = getKuulutusKohde(projekti, tilasiirtymaTyyppi);
  const kuulutusPath = getKuulutusPath(tilasiirtymaTyyppi);

  return {
    subject: kuulutusHyvaksyttavanaOtsikko({ asiatunnus, kuulutusTyyppiUpperCase, ...projekti }),
    text: kuulutusHyvaksyttavanaTeksti({ domain, kuulutusTyyppiLowerCase, kuulutusPath, kuulutusKohde, ...projekti }),
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}

export function createAloituskuulutusHyvaksyttyEmail(adapter: AloituskuulutusKutsuAdapter, muokkaaja: Kayttaja): EmailOptions {
  return {
    subject: adapter.substituteText(aloituskuulutusHyvaksyttyOtsikko),
    text: adapter.substituteText(aloituskuulutusHyvaksyttyTeksti),
    to: muokkaaja.email || undefined,
  };
}

export function createHyvaksymispaatosHyvaksyttyLaatijalleEmail(
  adapter: HyvaksymisPaatosVaiheKutsuAdapter,
  muokkaaja: Kayttaja
): EmailOptions {
  return {
    subject: adapter.substituteText(hyvaksymispaatosHyvaksyttyLaatijalleOtsikko),
    text: adapter.substituteText(hyvaksymispaatosHyvaksyttyLaatijalleTeksti),
    to: muokkaaja.email || undefined,
  };
}

export function createAloituskuulutusHyvaksyttyPDFEmail(adapter: AloituskuulutusKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(aloituskuulutusHyvaksyttyPDFOtsikko),
    text: adapter.substituteText(aloituskuulutusHyvaksyttyPDFTeksti),
    to: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createHyvaksymispaatosHyvaksyttyPaallikkolleEmail(adapter: HyvaksymisPaatosVaiheKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(hyvaksymispaatosHyvaksyttyPaallikolleOtsikko),
    text: adapter.substituteText(hyvaksymispaatosHyvaksyttyPaallikolleTeksti),
    to: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createJatkopaatosHyvaksyttyPaallikkolleEmail(adapter: HyvaksymisPaatosVaiheKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(jatkopaatosHyvaksyttyPaallikolleOtsikko),
    text: adapter.substituteText(jatkopaatosHyvaksyttyPaallikolleTeksti),
    to: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createJatkopaatosHyvaksyttyLaatijalleEmail(adapter: HyvaksymisPaatosVaiheKutsuAdapter, muokkaaja: Kayttaja): EmailOptions {
  return {
    subject: adapter.substituteText(jatkopaatosHyvaksyttyLaatijalleOtsikko),
    text: adapter.substituteText(jatkopaatosHyvaksyttyLaatijalleTeksti),
    to: muokkaaja.email || undefined,
  };
}

export function createNahtavillaoloVaiheKuulutusHyvaksyttyPDFEmail(adapter: NahtavillaoloVaiheKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(nahtavillaolovaihekuulutusHyvaksyttyPDFOtsikko),
    text: adapter.substituteText(nahtavillaolovaihekuulutusHyvaksyttyPDFTeksti),
    to: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createHyvaksymispaatosHyvaksyttyViranomaisilleEmail(adapter: HyvaksymisPaatosVaiheKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  const paragraphs = [hyvaksymispaatosHyvaksyttyViranomaisilleTekstiOsa1];
  if (adapter.uudelleenKuulutusSeloste) {
    paragraphs.push(adapter.uudelleenKuulutusSeloste);
    const ruotsiProps = adapter.props;
    ruotsiProps.kieli = Kieli.RUOTSI;
    const ruotsiAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(ruotsiProps);
    if (ruotsiAdapter.uudelleenKuulutusSeloste) {
      paragraphs.push(ruotsiAdapter.uudelleenKuulutusSeloste);
    }
  }
  paragraphs.push(adapter.substituteText(hyvaksymispaatosHyvaksyttyViranomaisilleTekstiOsa2));
  const subject =
    (adapter.uudelleenKuulutusSeloste ? uudelleenkuulutusOtsikkoPrefix : "") +
    adapter.substituteText(hyvaksymispaatosHyvaksyttyViranomaisilleOtsikko);
  return {
    subject,
    text: paragraphs.join("\n\n"),
    to: adapter.laheteKirjeVastaanottajat,
    cc: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createJatkopaatosHyvaksyttyViranomaisilleEmail(adapter: HyvaksymisPaatosVaiheKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  const paragraphs = [hyvaksymispaatosHyvaksyttyViranomaisilleTekstiOsa1];
  if (adapter.uudelleenKuulutusSeloste) {
    paragraphs.push(adapter.uudelleenKuulutusSeloste);
    const ruotsiProps = adapter.props;
    ruotsiProps.kieli = Kieli.RUOTSI;
    const ruotsiAdapter = new HyvaksymisPaatosVaiheKutsuAdapter(ruotsiProps);
    if (ruotsiAdapter.uudelleenKuulutusSeloste) {
      paragraphs.push(ruotsiAdapter.uudelleenKuulutusSeloste);
    }
  }
  paragraphs.push(adapter.substituteText(jatkopaatosHyvaksyttyViranomaisilleTekstiOsa));
  const subject =
    (adapter.uudelleenKuulutusSeloste ? uudelleenkuulutusOtsikkoPrefix : "") +
    adapter.substituteText(hyvaksymispaatosHyvaksyttyViranomaisilleOtsikko);
  return {
    subject,
    text: paragraphs.join("\n\n"),
    to: adapter.laheteKirjeVastaanottajat,
    cc: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createNewFeedbackAvailableEmail(projekti: DBProjekti, recipient: string): EmailOptions {
  return {
    subject: "Suunnitelmaan on tullut palautetta",
    text: "Suunnitelmaan on tullut palautetta: " + linkSuunnitteluVaiheYllapito(projekti.oid),
    to: recipient,
  };
}

export function createMuistutusKirjaamolleEmail(projekti: DBProjekti, muistutus: Muistutus, sahkoposti: string): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho) || "";
  return {
    subject: muistutusOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: sahkoposti,
  };
}

export function createKuittausMuistuttajalleEmail(projekti: DBProjekti, muistutus: Muistutus): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho) || "";
  return {
    subject: muistuttajanOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: muistutus.sahkoposti || undefined,
  };
}

export function createAnnaPalautettaPalvelustaEmail({ arvosana, kehitysehdotus }: PalveluPalauteInput): EmailOptions {
  return {
    subject: "Palvelua koskeva palaute",
    text: palveluPalauteTeksti({ arvosana, kehitysehdotus }),
    to: "tuki.vayliensuunnittelu@vayla.fi",
  };
}
