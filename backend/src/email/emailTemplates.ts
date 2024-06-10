import get from "lodash/get";
import {
  Kayttaja,
  KayttajaTyyppi,
  Kieli,
  PalveluPalauteInput,
  SuunnittelustaVastaavaViranomainen,
  TilasiirtymaTyyppi,
} from "hassu-common/graphql/apiModel";
import { config } from "../config";
import { DBProjekti, DBVaylaUser, Muistutus } from "../database/model";
import { linkNahtavillaOlo, linkSuunnitteluVaiheYllapito } from "hassu-common/links";
import { getLocalizedCountryName } from "hassu-common/getLocalizedCountryName";
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
import dayjs from "dayjs";
import { translate } from "../util/localization";
import * as API from "hassu-common/graphql/apiModel";
import { vastaavanViranomaisenYTunnus } from "../util/vastaavaViranomainen/yTunnus";
import { getLinkkiAsianhallintaan } from "../asianhallinta/getLinkkiAsianhallintaan";

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
  velho: DBProjekti["velho"];
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
  velho: DBProjekti["velho"];
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

export function createHyvaksymisesitysHyvaksyttavanaEmail(
  projekti: Pick<DBProjekti, "velho" | "muokattavaHyvaksymisEsitys" | "kayttoOikeudet" | "oid">
): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  return {
    subject: `Valtion liikenneväylien suunnittelu: Hyväksymisesitys odottaa hyväksyntää ${asiatunnus}`,
    text: `Valtion liikenneväylien suunnittelu -järjestelmän projektistasi ${projekti.velho?.nimi} on luotu hyväksymisesitys, joka odottaa hyväksyntääsi.
  
Voit tarkastella hyväksymisesitystä osoitteessa https://${domain}/yllapito/projekti/${projekti.oid}/hyvaksymisesitys
    
${projektiPaallikkoSuffix}`,
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}

export function createHyvaksymisesitysHyvaksyttyLaatijalleEmail(
  projekti: Pick<DBProjekti, "velho" | "oid" | "muokattavaHyvaksymisEsitys" | "kayttoOikeudet">
): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  const muokkaaja = projekti.kayttoOikeudet.find((ko) => ko.kayttajatunnus == projekti.muokattavaHyvaksymisEsitys?.muokkaaja);
  return {
    subject: `Valtion liikenneväylien suunnittelu: hyväksymisesitys hyväksytty ${asiatunnus}`,
    text: `Valtion liikenneväylien suunnittelu -järjestelmän projektisi ${projekti.velho?.nimi} hyväksymisesitys on hyväksytty.

Voit tarkastella hyväksymisesitystä osoitteessa https://${domain}/yllapito/projekti/${projekti.oid}/hyvaksymisesitys
    
Sait tämän viestin, koska sinut on merkitty hyväksymisesityksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`,
    to: muokkaaja?.email ?? undefined,
  };
}

export async function createHyvaksymisesitysHyvaksyttyPpEmail(
  projekti: Pick<DBProjekti, "velho" | "oid" | "muokattavaHyvaksymisEsitys" | "kayttoOikeudet" | "asianhallinta" | "asianhallinta">
): Promise<EmailOptions> {
  const asiatunnus = getAsiatunnus(projekti.velho);
  const linkkiAsianhallintaan = await getLinkkiAsianhallintaan(projekti);
  return {
    subject: `Valtion liikenneväylien suunnittelu: hyväksymisesitys hyväksytty ${asiatunnus}`,
    text: `Valtion liikenneväylien suunnittelu -järjestelmän projektisi ${projekti.velho?.nimi} hyväksymisesitys on hyväksytty.

Voit tarkastella hyväksymisesitystä osoitteessa https://${domain}/yllapito/projekti/${projekti.oid}/hyvaksymisesitys

${
  !projekti.asianhallinta?.inaktiivinen && linkkiAsianhallintaan !== undefined
    ? `Järjestelmä vie automaattisesti tarpeelliset tiedostot asianhallintaan. Käythän kuitenkin tarkistamassa asianhallinnan ${linkkiAsianhallintaan} .`
    : `Viethän hyväksymisesityksen asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.`
}

${projektiPaallikkoSuffix}`,
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}

export function createHyvaksymisesitysViranomaisilleEmail(
  projekti: Pick<DBProjekti, "velho" | "oid" | "muokattavaHyvaksymisEsitys" | "kayttoOikeudet" | "asianhallinta">
): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho);
  const projektiPaallikko = projekti.kayttoOikeudet.find((ko) => ko.tyyppi == API.KayttajaTyyppi.PROJEKTIPAALLIKKO);
  return {
    subject: `${projekti.muokattavaHyvaksymisEsitys?.kiireellinen ? "Kiire hyväksymisesitys" : "Hyväksymisesitys"} ${projekti.velho?.nimi}`,
    text: `${projekti.muokattavaHyvaksymisEsitys?.kiireellinen ? "Kiire hyväksymisesitys" : "Hyväksymisesitys"} ${projekti.velho?.nimi}

${
  projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO ? "Väylävirasto" : "ELY-keskus"
} lähettää suunnitelman ${projekti.velho?.nimi} hyväksyttäväksi Traficomiin${
      projekti.muokattavaHyvaksymisEsitys?.kiireellinen ? " kiireellisenä" : ""
    }. Suunnitelman hyväksymisesitys ja laskutustiedot hyväksymismaksua varten löytyy oheisen linkin takaa https://${domain}/suunnitelma/${
      projekti.oid
    }/hyvaksymisesityksen-aineistot
${
  projekti.muokattavaHyvaksymisEsitys?.hyvaksymisEsitys?.length &&
  `
Sähköpostin liitteenä on myös hyväksymisesitys.`
}
    
Lisätiedot 

${projekti.muokattavaHyvaksymisEsitys?.lisatiedot}



Laskutustiedot hyväksymismaksua varten

Suunnitelman nimi

${projekti.velho?.nimi}

Asiatunnus

${asiatunnus}

Vastuuorganisaatio

${translate(
  "vastaava-viranomainen." + projekti.velho?.suunnittelustaVastaavaViranomainen ?? API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
  API.Kieli.SUOMI
)}

Y-tunnus

${vastaavanViranomaisenYTunnus(projekti.velho?.suunnittelustaVastaavaViranomainen)}

OVT-tunnus

${projekti.muokattavaHyvaksymisEsitys?.laskutustiedot?.ovtTunnus}

Verkkolaskuoperaattorin välittäjätunnus

${projekti.muokattavaHyvaksymisEsitys?.laskutustiedot?.verkkolaskuoperaattorinTunnus}

Viite

${projekti.muokattavaHyvaksymisEsitys?.laskutustiedot?.viitetieto}



Lisätietoja suunnitelmasta antaa 

${projektiPaallikko?.etunimi} ${projektiPaallikko?.sukunimi} ${
      projektiPaallikko?.elyOrganisaatio
        ? translate("viranomainen." + projektiPaallikko.elyOrganisaatio, API.Kieli.SUOMI)
        : projektiPaallikko?.organisaatio
    }, 

puh ${projektiPaallikko?.puhelinnumero},

${projektiPaallikko?.email}


Tämä viesti on lähetetty automaattisesti Valtion liikenneväylien suunnittelu -järjestelmän kautta eikä siihen voi vastata.`,
    to: projekti.muokattavaHyvaksymisEsitys?.vastaanottajat?.map((vo) => vo.sahkoposti),
    cc: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
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
  const muistutusLiiteTeksti = getMuistutusLiiteTeksti(muistutus);
  const vastaanotettu = Date.parse(muistutus.vastaanotettu);

  const maaTeksti = muistutus.maakoodi ? `${getLocalizedCountryName("fi", muistutus.maakoodi)}\n` : "";
  const text = `Muistutus (VLS) ${muistutus.etunimi} ${muistutus.sukunimi} ${asiatunnus}

Vahvistus muistutuksen jättämisestä Valtion liikenneväylien suunnittelu -järjestelmän kautta
Aihe:
Muistutus on vastaanotettu
${dayjs(vastaanotettu).format("DD.MM.YYYY")} klo ${dayjs(vastaanotettu).format("HH:mm")}
Suunnitelman nimi
${projekti.velho?.nimi}
Suunnitelman asiatunnus
${asiatunnus}

Muistutuksen lähettäjän tiedot
Nimi
${muistutus.etunimi} ${muistutus.sukunimi}

Osoite
${muistutus.katuosoite}
${muistutus.postinumero} ${muistutus.postitoimipaikka}
${maaTeksti}
Sähköposti
${muistutus.sahkoposti ?? ""}
Puhelinnumero
${muistutus.puhelinnumero ?? ""}
Muistutus
${muistutus.muistutus}
${muistutusLiiteTeksti ? muistutusLiiteTeksti + "\n" : ""}
Suunnitelman tietoihin pääset tästä linkistä: ${linkNahtavillaOlo(projekti, Kieli.SUOMI)}`;
  return {
    subject: `Muistutus (VLS) ${muistutus.etunimi} ${muistutus.sukunimi} ${asiatunnus}`,
    text,
    to: sahkoposti,
  };
}

export function createKuittausMuistuttajalleEmail(projekti: DBProjekti, muistutus: Muistutus): EmailOptions {
  const asiatunnus = getAsiatunnus(projekti.velho) ?? "";

  const muistutusLiiteTeksti = getMuistutusLiiteTeksti(muistutus);
  let subject = "Muistutus on vastaanotettu";
  let text = `Muistutus on vastaanotettu
Suunnitelman nimi: ${projekti.velho?.nimi ?? ""}
Suunnitelman asiatunnus: ${asiatunnus}

${
  projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO ? "Väylävirasto" : "ELY-keskus"
} käsittelee muistutustasi asiatunnuksella. Mikäli haluat olla yhteydessä suunnitelmaan liittyen ilmoitathan asiatunnuksen viestissäsi.

Suunnitelman tietoihin pääset tästä linkistä: ${linkNahtavillaOlo(projekti, Kieli.SUOMI)}

Muistutus:
${muistutus.muistutus ?? ""}

${muistutusLiiteTeksti}
`;
  if (projekti.kielitiedot?.ensisijainenKieli === Kieli.RUOTSI || projekti.kielitiedot?.toissijainenKieli === Kieli.RUOTSI) {
    text += `
Anmärkningen har mottagits
Planens namn: ${projekti.kielitiedot.projektinNimiVieraskielella}
Planens ärendekod: ${asiatunnus}

${
  projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
    ? "Trafikledsverket"
    : "NTM-centralen"
} behandlar din anmärkning med en ärendekod. Om du vill kontakta oss i anslutning till planen, meddela ärendekoden i ditt meddelande.

Du kommer till planens uppgifter via denna länk: ${linkNahtavillaOlo(projekti, Kieli.RUOTSI)}

Anmärkning:
${muistutus.muistutus ?? ""}

${getMuistutusLiiteTeksti(muistutus, "Bilagor med följande namn som bifogats anmärkningen")}
`;
    subject += " / Anmärkningen har mottagits";
  }
  const email = {
    subject,
    text,
    to: muistutus.sahkoposti ?? undefined,
  };
  return email;
}

function getMuistutusLiiteTeksti(muistutus: Muistutus, otsikko = "Muistutuksen mukana toimitettu seuraavannimiset liitteet") {
  if (!muistutus.liitteet?.length) {
    return "";
  }

  return `${otsikko}:
${muistutus.liitteet
  .map((liite) => {
    const idx = liite?.lastIndexOf("/") ?? -1;
    return liite.substring(idx + 1);
  })
  .join("\n")}`;
}

export function createAnnaPalautettaPalvelustaEmail({ arvosana, kehitysehdotus }: PalveluPalauteInput): EmailOptions {
  return {
    subject: "Palvelua koskeva palaute",
    text: palveluPalauteTeksti({ arvosana, kehitysehdotus }),
    to: "tuki.vayliensuunnittelu@vayla.fi",
  };
}

const kuukausiEpaaktiiviseenOtsikko = (obj: { velho: DBProjekti["velho"] }) =>
  otsikko({ otsikkoSuffix: `Suunnitelma ${obj.velho?.nimi} siirtyy epäaktiiviseen tilaan` });

const kuukausiEpaaktiiviseenTeksti: (obj: {
  velho: DBProjekti["velho"];
  projektiPaallikkoSuffix: string;
}) => string = template`Suunnitelma ${"velho.nimi"} siirtyy epäaktiiviseen tilaan Valtion liikenneväylien suunnittelu -järjestelmässä kuukauden kuluttua. Tämä tarkoittaa sitä, että suunnitelma poistuu palvelun kansalaisnäkymästä ja samalla virkamiesnäkymässä suunnitelman tiedot lukittuvat eli tietoja ei pysty muokkaamaan ja suunnitelmaan liittyvät asiakirjat poistetaan palvelusta.

Tarkista ennen suunnitelman siirtymistä epäaktiiviseksi, että asianhallintaan tallennettavat asiakirjat (kuulutukset ja ilmoitukset) löytyvät suunnitelman asialta. Ota tarvittaessa talteen myös suunnitelmasta saadut palautteet.

Suunnitelma siirtyy epäaktiiviseen tilaan kun hyväksymispäätöksen kuulutuksen päättymisestä on kulunut yksi vuosi. Käsittelyn tila -sivu pysyy pääkäyttäjän muokattavissa. Pääkäyttäjä aktivoi suunnitelman uudelleen, jos suunnitelman voimassaoloa myöhemmin jatketaan.

${"projektiPaallikkoSuffix"}`;

export function createKuukausiEpaaktiiviseenEmail(projekti: DBProjekti): EmailOptions {
  return {
    subject: kuukausiEpaaktiiviseenOtsikko({
      velho: projekti.velho,
    }),
    text: kuukausiEpaaktiiviseenTeksti({
      velho: projekti.velho,
      projektiPaallikkoSuffix,
    }),
    to: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
  };
}
