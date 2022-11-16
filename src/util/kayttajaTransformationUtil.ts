import {
  KayttajaTyyppi,
  Kieli,
  ProjektiKayttaja,
  StandardiYhteystiedot,
  StandardiYhteystiedotInput,
  SuunnitteluSopimus,
  Yhteystieto,
  YhteystietoInput,
} from "@services/api";
import { kuntametadata } from "common/kuntametadata";
import replace from "lodash/replace";

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
  };
}

export function yhteystietoVirkamiehelleTekstiksi(yhteystieto: (Yhteystieto | YhteystietoInput) & { kayttajatunnus?: string | null }) {
  const { etunimi, sukunimi, kayttajatunnus, organisaatio, kunta, puhelinnumero, sahkoposti } = yhteystieto;
  return `${etunimi} ${sukunimi}${kayttajatunnus ? `, ${kayttajatunnus},` : ""} (${
    kunta ? kuntametadata.nameForKuntaId(kunta, Kieli.SUOMI) : organisaatio
  }), ${puhelinnumero}, ${sahkoposti}`;
}

export function yhteystietoKansalaiselleTekstiksi(lang: string, yhteystieto: Yhteystieto) {
  const { etunimi, sukunimi, organisaatio, kunta, puhelinnumero, sahkoposti } = yhteystieto;
  const kieli = lang === "sv" ? Kieli.RUOTSI : lang === "fi" ? Kieli.SUOMI : Kieli.SAAME;
  return replace(
    `${etunimi} ${sukunimi} (${kunta ? kuntametadata.nameForKuntaId(kunta, kieli) : organisaatio}), ${puhelinnumero}, ${sahkoposti}`,
    "@",
    "[at]"
  );
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
