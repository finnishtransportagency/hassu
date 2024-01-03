import get from "lodash/get";
import { Kayttaja, KayttajaTyyppi, Kieli, PalveluPalauteInput, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { config } from "../config";
import { DBProjekti, DBVaylaUser, Muistutus, Velho } from "../database/model";
import { linkSuunnitteluVaiheYllapito } from "hassu-common/links";
import {
  findHyvaksymisPaatosVaiheWaitingForApproval,
  findJatkoPaatos1VaiheWaitingForApproval,
  findJatkoPaatos2VaiheWaitingForApproval,
  findNahtavillaoloWaitingForApproval,
  getAsiatunnus,
} from "../projekti/projektiUtil";
import { assertIsDefined } from "../util/assertions";
import { HyvaksymisPaatosVaiheKutsuAdapter } from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { EmailOptions } from "./model/emailOptions";
import { KuulutusKutsuAdapter, KuulutusKutsuAdapterProps } from "../asiakirja/adapter/kuulutusKutsuAdapter";

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

const domain = config.frontendDomainName ?? "vayliensuunnittelu.fi";

const projektiPaallikkoSuffix = `Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const muokkaajaSuffix = `Sait tämän viestin, koska sinut on merkitty kuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;

const otsikko: (obj: { otsikkoSuffix: string }) => string = template`Valtion liikenneväylien suunnittelu: ${"otsikkoSuffix"}`;

// Projektin perustaminen
const perustamisOtsikko = (obj: { asiatunnus: string | undefined }) =>
  otsikko({ otsikkoSuffix: `Uusi projekti perustettu ${obj.asiatunnus}` });
const perustamisTeksti: (obj: {
  velho: Velho | null | undefined;
  oid: string;
  suffix: string;
  domain: string;
}) => string = template`Valtion liikenneväylien suunnittelu -järjestelmään on tuotu Projektivelhosta projektisi:
${"velho.nimi"}

Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}

${"suffix"}`;

// Aloituskuulutuksen hyvaksymispyynto
const kuulutusHyvaksyttavanaOtsikko: (obj: {
  kuulutusTyyppiUpperCase: string;
  asiatunnus: string | undefined;
}) => string = template`Valtion liikenneväylien suunnittelu: ${"kuulutusTyyppiUpperCase"} odottaa hyväksyntää ${"asiatunnus"}`;
const kuulutusHyvaksyttavanaTeksti: (obj: {
  velho: Velho | null | undefined;
  kuulutusTyyppiLowerCase: string;
  kuulutusKohde: string;
  domain: string;
  oid: string;
  kuulutusPath: string;
  suffix: string;
}) => string = template`Valtion liikenneväylien suunnittelu -järjestelmän projektistasi ${"velho.nimi"} on luotu ${"kuulutusTyyppiLowerCase"}, ${"kuulutusKohde"} hyväksyntääsi.

Voit tarkastella kuulutusta osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}${"kuulutusPath"}

${"suffix"}`;

const kuulutusOtsikko: (obj: {
  kuulutuksenTila: "hyväksytty" | "odottaa hyväksyntää";
}) => string = template`Valtion liikenneväylien suunnittelu: {{kuulutusNimiCapitalized}} ${"kuulutuksenTila"} {{asiatunnus}}`;

const kuulutusHyvaksyttyTeksti: ({
  suffix,
}: {
  suffix: string;
}) => string = template`Valtion liikenneväylien suunnittelu -järjestelmän projektisi {{nimi}} {{kuulutusNimi}} on hyväksytty.

Voit tarkastella kuulutusta osoitteessa {{kuulutusYllapitoUrl}}

${"suffix"}`;

const ppHyvaksyttySuffix = `Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.

${projektiPaallikkoSuffix}`;
const ppHyvaksyttyLinkkiAsianhallintaanSuffix = `Järjestelmä vie automaattisesti tarpeelliset tiedostot asianhallintaan. Käythän kuitenkin tarkistamassa asianhallinnan{{linkkiAsianhallintaan}}.

${projektiPaallikkoSuffix}`;

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
  projekti.oid;
  projekti.velho;
  return {
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
    subject: perustamisOtsikko({ asiatunnus }),
    text: perustamisTeksti({ domain, oid: projekti.oid, velho: projekti.velho, suffix: projektiPaallikkoSuffix }),
  };
}

function getKuulutusTyyppi(tilasiirtymaTyyppi: TilasiirtymaTyyppi): string {
  switch (tilasiirtymaTyyppi) {
    case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
      return "Aloituskuulutus";
    case TilasiirtymaTyyppi.NAHTAVILLAOLO:
      return "Nähtävilläolokuulutus";
    case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
      return "Hyväksymispäätöskuulutus";
    case TilasiirtymaTyyppi.JATKOPAATOS_1:
      return "Jatkopäätöskuulutus";
    case TilasiirtymaTyyppi.JATKOPAATOS_2:
      return "Jatkopäätöskuulutus";
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
    case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
      if (findHyvaksymisPaatosVaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
    case TilasiirtymaTyyppi.JATKOPAATOS_1:
      if (findJatkoPaatos1VaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
    case TilasiirtymaTyyppi.JATKOPAATOS_2:
      if (findJatkoPaatos2VaiheWaitingForApproval(projekti)?.aineistoMuokkaus) {
        return aineistotOdottavat;
      }
      return jokaOdottaa;
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
    subject: kuulutusHyvaksyttavanaOtsikko({
      asiatunnus,
      kuulutusTyyppiUpperCase,
    }),
    text: kuulutusHyvaksyttavanaTeksti({
      kuulutusTyyppiLowerCase,
      kuulutusPath,
      kuulutusKohde,
      domain,
      oid: projekti.oid,
      suffix: projektiPaallikkoSuffix,
      velho: projekti.velho,
    }),
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}

export function createKuulutusHyvaksyttyLaatijalleEmail(
  adapter: KuulutusKutsuAdapter<KuulutusKutsuAdapterProps>,
  muokkaaja: Kayttaja
): EmailOptions {
  return {
    subject: adapter.substituteText(kuulutusOtsikko({ kuulutuksenTila: "hyväksytty" })),
    text: adapter.substituteText(kuulutusHyvaksyttyTeksti({ suffix: muokkaajaSuffix })),
    to: muokkaaja.email ?? undefined,
  };
}

export function createKuulutusHyvaksyttyPpEmail(adapter: KuulutusKutsuAdapter<KuulutusKutsuAdapterProps>): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(kuulutusOtsikko({ kuulutuksenTila: "hyväksytty" })),
    text: adapter.substituteText(
      kuulutusHyvaksyttyTeksti({ suffix: adapter.asianhallintaPaalla ? ppHyvaksyttyLinkkiAsianhallintaanSuffix : ppHyvaksyttySuffix })
    ),
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
  const asiatunnus = getAsiatunnus(projekti.velho) ?? "";
  return {
    subject: muistutusOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: sahkoposti,
  };
}

export function createKuittausMuistuttajalleEmail(projekti: DBProjekti, muistutus: Muistutus): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho) ?? "";
  return {
    subject: muistuttajanOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: muistutus.sahkoposti ?? undefined,
  };
}

export function createAnnaPalautettaPalvelustaEmail({ arvosana, kehitysehdotus }: PalveluPalauteInput): EmailOptions {
  return {
    subject: "Palvelua koskeva palaute",
    text: palveluPalauteTeksti({ arvosana, kehitysehdotus }),
    to: "tuki.vayliensuunnittelu@vayla.fi",
  };
}
