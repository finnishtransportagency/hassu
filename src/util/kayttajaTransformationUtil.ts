import {
  ELY,
  Elinvoimakeskus,
  KayttajaTyyppi,
  Kieli,
  ProjektiKayttaja,
  StandardiYhteystiedot,
  StandardiYhteystiedotInput,
  SuunnitteluSopimus,
  Yhteystieto,
  YhteystietoInput,
} from "@services/api";
import { organisaatioIsEly, organisaatioIsEvk } from "hassu-common/util/organisaatioIsEly";
import { kuntametadata } from "hassu-common/kuntametadata";
import replace from "lodash/replace";
import { Translate } from "next-translate";

export default function projektiKayttajaToYhteystieto(
  projektiKayttaja: ProjektiKayttaja,
  suunnitteluSopimus?: SuunnitteluSopimus | null
): Yhteystieto {
  return {
    __typename: "Yhteystieto",
    etunimi: projektiKayttaja.etunimi,
    sukunimi: projektiKayttaja.sukunimi,
    puhelinnumero: projektiKayttaja.puhelinnumero || "",
    sahkoposti: projektiKayttaja.email,
    kunta: suunnitteluSopimus?.yhteysHenkilo === projektiKayttaja.kayttajatunnus ? suunnitteluSopimus?.kunta : null,
    organisaatio: projektiKayttaja.organisaatio,
    elyOrganisaatio: projektiKayttaja.elyOrganisaatio,
    evkOrganisaatio: projektiKayttaja.evkOrganisaatio,
  };
}

export function muodostaOrganisaatioTeksti(
  {
    organisaatio,
    kunta,
    elyOrganisaatio,
    evkOrganisaatio,
  }: Pick<Yhteystieto, "organisaatio" | "kunta" | "elyOrganisaatio" | "evkOrganisaatio">,
  t: Translate,
  lang: string
) {
  let organisaatioTeksti = organisaatio || "";
  if (kunta) {
    const kieli = lang === "sv" ? Kieli.RUOTSI : Kieli.SUOMI;
    organisaatioTeksti = kuntametadata.nameForKuntaId(kunta, kieli);
  } else if (organisaatioIsEly(organisaatio) && elyOrganisaatio) {
    organisaatioTeksti = t(`common:viranomainen.${elyOrganisaatio}`);
  } else if (organisaatioIsEvk(organisaatio) && evkOrganisaatio) {
    organisaatioTeksti = t(`common:viranomainen.${evkOrganisaatio}`);
  }

  return organisaatioTeksti;
}

export function yhteystietoVirkamiehelleTekstiksi(
  yhteystieto: (Yhteystieto | YhteystietoInput) & {
    kayttajatunnus?: string | null;
    elyOrganisaatio?: ELY | null | undefined;
    evkOrganisaatio?: Elinvoimakeskus | null | undefined;
  },
  t: Translate
) {
  const { etunimi, sukunimi, kayttajatunnus, puhelinnumero, sahkoposti } = yhteystieto;
  const organisaatioTeksti = muodostaOrganisaatioTeksti(yhteystieto, t, "fi");

  return `${etunimi} ${sukunimi}${kayttajatunnus ? `, ${kayttajatunnus},` : ""} (${organisaatioTeksti}), ${puhelinnumero}, ${sahkoposti}`;
}

export function yhteystietoKansalaiselleTekstiksi(lang: string, yhteystieto: Yhteystieto, t: Translate) {
  const { etunimi, sukunimi, puhelinnumero, sahkoposti } = yhteystieto;
  const organisaatioTeksti = muodostaOrganisaatioTeksti(yhteystieto, t, lang);

  return replace(`${etunimi} ${sukunimi} (${organisaatioTeksti}), ${puhelinnumero}, ${sahkoposti}`, "@", "[at]");
}

export function standardiYhteystiedotYhteystiedoiksi(
  standardiYhteystiedot: StandardiYhteystiedot | StandardiYhteystiedotInput | null | undefined,
  kayttoOikeudet: ProjektiKayttaja[] | null | undefined,
  suunnitteluSopimus?: SuunnitteluSopimus | null,
  pakotaProjariTaiKunnanEdustaja?: boolean
): (Yhteystieto | YhteystietoInput)[] {
  const yt: (Yhteystieto | YhteystietoInput)[] = [];
  const sahkopostit: string[] = [];
  let projarinEmail: string | undefined;
  // Lisätään ensin yt-listaan yhteystietoja standardiYhteystiedot.yhteysHenkilot perusteella
  kayttoOikeudet
    ?.filter(({ kayttajatunnus, tyyppi, email }) => {
      const onProjari = tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO;
      if (onProjari) {
        projarinEmail = email; // laita projarin email talteen myöhempää järjestämistoimintoa varten
      }
      const onKunnanEdustaja = kayttajatunnus === suunnitteluSopimus?.yhteysHenkilo;
      return (
        // jos pakotustoiminto on valittu, lisää yhteystietoihin kunnan edustaja tai projari riippuen siitä, onko suunnitteluSopimus olemassa vai ei
        (pakotaProjariTaiKunnanEdustaja && (suunnitteluSopimus ? onKunnanEdustaja : onProjari)) ||
        standardiYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
      );
    })
    .forEach((oikeus) => {
      yt.push(projektiKayttajaToYhteystieto(oikeus, suunnitteluSopimus)); // kunnan edustajalle insertoidaan kunta, jos suunnitteluSopimus on annettu
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  // Lisätään sitten yt-listaan yhteystietoja standardiyhteystiedot.yhteysTiedot perusteella
  standardiYhteystiedot?.yhteysTiedot?.forEach((yhteystieto) => {
    if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
      //Varmista, ettei ole duplikaatteja
      yt.push(yhteystieto);
      sahkopostit.push(yhteystieto.sahkoposti);
    }
  });
  // Järjestetään kunnan edustaja ensin, ja sitten projari, ja sitten loput
  yt.sort((a, b) => {
    if (a.kunta) {
      return -1;
    } else if (b.kunta) {
      return 1;
    } else if (a.sahkoposti === projarinEmail) {
      return -1;
    } else if (b.sahkoposti === projarinEmail) {
      return 1;
    } else {
      return 0;
    }
  });
  return yt;
}
