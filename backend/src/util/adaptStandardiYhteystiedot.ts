import { DBProjekti, StandardiYhteystiedot, Yhteystieto } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { vaylaUserToYhteystieto } from "./vaylaUserToYhteystieto";

export function adaptStandardiYhteystiedotToYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaKunnanEdustaja?: boolean // true, kunnan edustaja pakotetaan projarin sijaan
): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  dbProjekti.kayttoOikeudet
    .filter(
      ({ kayttajatunnus, tyyppi }) =>
        (pakotaKunnanEdustaja
          ? kayttajatunnus === dbProjekti?.suunnitteluSopimus?.yhteysHenkilo
          : tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO) || kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
    )
    .forEach((oikeus) => {
      yt.push(vaylaUserToYhteystieto(oikeus, dbProjekti?.suunnitteluSopimus)); // kunnan edustajalle insertoidaan kunta, jos suunnitteluSopimus on annettu
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  if (kuulutusYhteystiedot?.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot?.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push(yhteystieto);
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}

export function adaptStandardiYhteystiedotToAPIYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaKunnanEdustaja?: boolean
): API.Yhteystieto[] {
  const yt: API.Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  const projari = dbProjekti.kayttoOikeudet.find(({ tyyppi }) => tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO);
  const kunnanEdustaja = dbProjekti.kayttoOikeudet.find(
    ({ kayttajatunnus }) => kayttajatunnus === dbProjekti.suunnitteluSopimus?.yhteysHenkilo
  );
  if (kunnanEdustaja && pakotaKunnanEdustaja) {
    yt.push({ __typename: "Yhteystieto", ...vaylaUserToYhteystieto(kunnanEdustaja, dbProjekti?.suunnitteluSopimus) });
  } else if (projari) {
    yt.push({ __typename: "Yhteystieto", ...vaylaUserToYhteystieto(projari, dbProjekti?.suunnitteluSopimus) });
  }
  dbProjekti.kayttoOikeudet
    .filter(
      ({ kayttajatunnus }) =>
        (kunnanEdustaja && pakotaKunnanEdustaja
          ? kunnanEdustaja.kayttajatunnus !== kayttajatunnus
          : projari?.kayttajatunnus !== kayttajatunnus) && kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
    )
    .forEach((oikeus) => {
      yt.push({ __typename: "Yhteystieto", ...vaylaUserToYhteystieto(oikeus, dbProjekti?.suunnitteluSopimus) }); // kunnan edustajalle insertoidaan kunta, jos suunnitteluSopimus on annettu
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  if (kuulutusYhteystiedot?.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot?.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push({ __typename: "Yhteystieto", ...yhteystieto });
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}

export function adaptStandardiYhteystiedotLisaamattaProjaria(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null
): API.Yhteystieto[] {
  const yt: API.Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  dbProjekti.kayttoOikeudet
    .filter(({ kayttajatunnus }) => kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus))
    .forEach((oikeus) => {
      yt.push({ __typename: "Yhteystieto", ...vaylaUserToYhteystieto(oikeus) });
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  if (kuulutusYhteystiedot?.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot?.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push({ __typename: "Yhteystieto", ...yhteystieto });
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}
