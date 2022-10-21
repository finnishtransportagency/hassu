import { DBProjekti, StandardiYhteystiedot, Yhteystieto, DBVaylaUser } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { vaylaUserToYhteystieto } from "./vaylaUserToYhteystieto";

export function adaptStandardiYhteystiedotToYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined,
  pakotaKunnanEdustaja?: boolean
): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  let pakottamisEhto = (hlo: DBVaylaUser) => hlo.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO;
  if (pakotaKunnanEdustaja && dbProjekti.suunnitteluSopimus?.yhteysHenkilo) {
    pakottamisEhto = (hlo: DBVaylaUser) => hlo.kayttajatunnus === dbProjekti.suunnitteluSopimus?.yhteysHenkilo;
  }

  dbProjekti.kayttoOikeudet
    .filter((hlo) => pakottamisEhto(hlo) || kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === hlo.kayttajatunnus))
    .forEach((oikeus) => {
      yt.push(vaylaUserToYhteystieto(oikeus, dbProjekti?.suunnitteluSopimus));
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
  kuulutusYhteystiedot: StandardiYhteystiedot | null | undefined
): API.Yhteystieto[] {
  const yt: API.Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  dbProjekti.kayttoOikeudet
    .filter(
      ({ kayttajatunnus, tyyppi }) =>
        tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO || kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
    )
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
