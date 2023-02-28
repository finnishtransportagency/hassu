import get from "lodash/get";
import { Kayttaja, KayttajaTyyppi, PalveluPalauteInput } from "../../../common/graphql/apiModel";
import { config } from "../config";
import { DBProjekti, DBVaylaUser, Muistutus } from "../database/model";
import { EmailOptions } from "./email";
import { linkSuunnitteluVaihe } from "../../../common/links";
import { getAsiatunnus } from "../projekti/projektiUtil";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { assertIsDefined } from "../util/assertions";

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
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvaksymispyynto
const aloituskuulutusHyvaksyttavanaOtsikko = template`Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ${"asiatunnus"}`;
const aloituskuulutusHyvaksyttavanaTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektistasi
${"velho.nimi"}
on luotu aloituskuulutus, joka odottaa hyväksyntääsi.
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen ilmoitus laatijalle
const aloituskuulutusHyvaksyttyOtsikko = "Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty {{asiatunnus}}";
const aloituskuulutusHyvaksyttyTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektin
{{nimi}}
aloituskuulutus on hyväksytty.
Voit tarkastella aloituskuulutusta osoitteessa {{aloituskuulutusYllapitoUrl}}
Saat tämän viestin, koska sinut on merkitty aloituskuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen pdf projektipaallikolle
const aloituskuulutusHyvaksyttyPDFOtsikko = `Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty {{asiatunnus}}`;
const hyvaksyttyPDFTeksti = `Valtion liikenneväylien suunnittelu -järjestelmän projektin
{{nimi}}
aloituskuulutus on hyväksytty. Liitteenä aloituskuulutus PDF-tiedostona, muistathan viedä sen asiakirjanhallintaan.

Voit tarkastella aloituskuulutusta osoitteessa {{aloituskuulutusYllapitoUrl}}

Saat tämän viestin, koska sinut on merkitty aloituskuulutuksen projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
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

function projektiPaallikkoJaVarahenkilotEmails(kayttoOikeudet: DBVaylaUser[]): string[] {
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

export function createAloituskuulutusHyvaksyttavanaEmail(projekti: DBProjekti): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  return {
    subject: aloituskuulutusHyvaksyttavanaOtsikko({ asiatunnus, ...projekti }),
    text: aloituskuulutusHyvaksyttavanaTeksti({ domain, ...projekti }),
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

export function createAloituskuulutusHyvaksyttyPDFEmail(adapter: AloituskuulutusKutsuAdapter): EmailOptions {
  assertIsDefined(adapter.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  return {
    subject: adapter.substituteText(aloituskuulutusHyvaksyttyPDFOtsikko),
    text: adapter.substituteText(hyvaksyttyPDFTeksti),
    to: projektiPaallikkoJaVarahenkilotEmails(adapter.kayttoOikeudet),
  };
}

export function createNewFeedbackAvailableEmail(oid: string, recipient: string): EmailOptions {
  return {
    subject: "Suunnitelmaan on tullut palautetta",
    text: "Suunnitelmaan on tullut palautetta: " + linkSuunnitteluVaihe(oid),
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
