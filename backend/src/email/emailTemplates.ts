import get from "lodash/get";
import { Kayttaja, KayttajaTyyppi, Viranomainen } from "../../../common/graphql/apiModel";
import { config } from "../config";
import { DBProjekti, DBVaylaUser, Muistutus } from "../database/model";
import { EmailOptions } from "./email";
import { linkSuunnitteluVaihe } from "../../../common/links";
import { getAsiatunnus } from "../projektiSearch/projektiSearchAdapter";

function template(strs: TemplateStringsArray, ...exprs: string[]) {
  return function (obj: unknown) {
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
const hyvaksyttavanaOtsikko = template`Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ${"asiatunnus"}`;
const hyvaksyttavanaTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektistasi
${"velho.nimi"}
on luotu aloituskuulutus, joka odottaa hyväksyntääsi.
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen ilmoitus laatijalle
const hyvaksyttyOtsikko = template`Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty ${"asiatunnus"}`;
const hyvaksyttyTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektin
${"velho.nimi"}
aloituskuulutus on hyväksytty.
Voit tarkastella aloituskuulutusta osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}/aloituskuulutus
Saat tämän viestin, koska sinut on merkitty aloituskuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
// Aloituskuulutuksen hyvksyminen pdf projektipaallikolle
const hyvaksyttyPDFOtsikko = template`Valtion liikenneväylien suunnittelu: Aloituskuulutus hyväksytty ${"asiatunnus"}`;
const hyvaksyttyPDFTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektin
${"velho.nimi"}
aloituskuulutus on hyväksytty. Liitteenä aloituskuulutus PDF-tiedostona, muistathan viedä sen asiakirjanhallintaan.

Voit tarkastella aloituskuulutusta osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}/aloituskuulutus

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

function projektiPaallikkoJaVarahenkilotEmails(kayttoOikeudet: DBVaylaUser[]): string[] {
  return kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO || user.tyyppi == KayttajaTyyppi.VARAHENKILO)
    .map((user) => user.email);
}

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti);
  return {
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
    subject: perustamisOtsikko({ asiatunnus, ...projekti }),
    text: perustamisTeksti({ domain, asiatunnus, ...projekti }),
  };
}

export function createHyvaksyttavanaEmail(projekti: DBProjekti): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti);
  return {
    subject: hyvaksyttavanaOtsikko({ asiatunnus, ...projekti }),
    text: hyvaksyttavanaTeksti({ domain, ...projekti }),
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}

export function createAloituskuulutusHyvaksyttyEmail(projekti: DBProjekti, muokkaaja: Kayttaja): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti);
  return {
    subject: hyvaksyttyOtsikko({ asiatunnus, ...projekti }),
    text: hyvaksyttyTeksti({ domain, ...projekti }),
    to: muokkaaja.email || undefined,
  };
}

export function createAloituskuulutusHyvaksyttyPDFEmail(projekti: DBProjekti): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti);
  return {
    subject: hyvaksyttyPDFOtsikko({ asiatunnus, ...projekti }),
    text: hyvaksyttyPDFTeksti({ domain, ...projekti }),
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
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
  const asiatunnus =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    projekti.velho.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        projekti.velho.asiatunnusELY
      : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        projekti.velho.asiatunnusVayla;
  return {
    subject: muistutusOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: sahkoposti,
  };
}

export function createKuittausMuistuttajalleEmail(projekti: DBProjekti, muistutus: Muistutus): EmailOptions {
  const asiatunnus =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    projekti.velho.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        projekti.velho.asiatunnusELY
      : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        projekti.velho.asiatunnusVayla;
  return {
    subject: muistuttajanOtsikko(muistutus),
    text: muistutusTeksti({ asiatunnus, ...muistutus }),
    to: muistutus.sahkoposti || undefined,
  };
}
