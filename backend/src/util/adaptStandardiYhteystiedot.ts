import { DBProjekti, DBVaylaUser, StandardiYhteystiedot, Yhteystieto } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { vaylaUserToYhteystieto } from "./vaylaUserToYhteystieto";

export function adaptStandardiYhteystiedotToYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaProjari?: boolean,
  pakotaKunnanEdustaja?: boolean // true, kunnan edustaja pakotetaan projarin sijaan
): Yhteystieto[] {
  const naytettavatKayttajat = haeNaytettavatKayttajatJarjestettyna(dbProjekti, kuulutusYhteystiedot, pakotaKunnanEdustaja, pakotaProjari);
  const lisatytYhteytiedot =
    kuulutusYhteystiedot?.yhteysTiedot
      //Varmista, ettei ole duplikaatteja
      ?.filter((yhteystieto) => !naytettavatKayttajat.map(({ email }) => email).find((email) => email === yhteystieto.sahkoposti)) ?? [];
  const newLocal = naytettavatKayttajat.map((user) => vaylaUserToYhteystieto(user, dbProjekti.suunnitteluSopimus));
  return [...newLocal, ...lisatytYhteytiedot];
}

export function adaptStandardiYhteystiedotToIncludePakotukset(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaProjari?: boolean,
  pakotaKunnanEdustaja?: boolean // true, kunnan edustaja pakotetaan projarin sijaan
): StandardiYhteystiedot {
  return {
    yhteysHenkilot: haeNaytettavatKayttajatJarjestettyna(dbProjekti, kuulutusYhteystiedot, pakotaKunnanEdustaja, pakotaProjari).map(
      (kayttoOikeus) => kayttoOikeus.kayttajatunnus
    ),
    yhteysTiedot: kuulutusYhteystiedot?.yhteysTiedot,
  };
}

const userIsKunnanedustaja = (user: DBVaylaUser, projekti: DBProjekti) =>
  user.kayttajatunnus === projekti.suunnitteluSopimus?.yhteysHenkilo;
const userIsProjektipaallikko = (user: DBVaylaUser) => user.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO;

const sortKunnanedustajaOrProjektipaallikkoFirst =
  (
    dbProjekti: DBProjekti,
    pakotaKunnanEdustaja: boolean | undefined,
    pakotaProjari: boolean | undefined
  ): ((a: DBVaylaUser, b: DBVaylaUser) => number) | undefined =>
  (a, b) => {
    if (pakotaKunnanEdustaja) {
      if (userIsKunnanedustaja(a, dbProjekti)) {
        return -1;
      } else if (userIsKunnanedustaja(b, dbProjekti)) {
        return 1;
      }
    } else if (pakotaProjari) {
      if (userIsProjektipaallikko(a)) {
        return -1;
      } else if (userIsProjektipaallikko(b)) {
        return 1;
      }
    }
    return 0;
  };

function haeNaytettavatKayttajatJarjestettyna(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaKunnanEdustaja: boolean | undefined,
  pakotaProjari: boolean | undefined
): DBVaylaUser[] {
  const pakotettuKunnanEdustajaExists =
    !!pakotaKunnanEdustaja && dbProjekti.kayttoOikeudet.some((user) => userIsKunnanedustaja(user, dbProjekti));
  return dbProjekti.kayttoOikeudet
    .filter((user) => {
      const userIsPakotettuKunnanEdustaja = !!pakotaKunnanEdustaja && userIsKunnanedustaja(user, dbProjekti);
      const userIsPakotettuProjari = !pakotettuKunnanEdustajaExists && !!pakotaProjari && userIsProjektipaallikko(user);
      const userIsInKuulutusYhteystiedot = !!kuulutusYhteystiedot?.yhteysHenkilot?.some((yh) => yh === user.kayttajatunnus);

      return userIsPakotettuKunnanEdustaja || userIsPakotettuProjari || userIsInKuulutusYhteystiedot;
    })
    .sort(sortKunnanedustajaOrProjektipaallikkoFirst(dbProjekti, pakotaKunnanEdustaja, pakotaProjari));
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
      yt.push({ __typename: "Yhteystieto", ...vaylaUserToYhteystieto(oikeus, dbProjekti.suunnitteluSopimus) });
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

export function yhteystiedotBackToStandardiYhteystiedot(dbProjekti: DBProjekti, yhteystiedot: Yhteystieto[]): StandardiYhteystiedot {
  const standardiYhteystiedot: StandardiYhteystiedot = {
    yhteysHenkilot: [],
    yhteysTiedot: [],
  };
  const projektiHenkilot = dbProjekti.kayttoOikeudet;
  yhteystiedot.forEach((yt) => {
    const foundInKayttoOikeudet = projektiHenkilot.find((hlo) => hlo.email === yt.sahkoposti);
    if (foundInKayttoOikeudet) {
      standardiYhteystiedot.yhteysHenkilot?.push(foundInKayttoOikeudet.kayttajatunnus);
    } else {
      standardiYhteystiedot.yhteysTiedot?.push(yt);
    }
  });
  return standardiYhteystiedot;
}
