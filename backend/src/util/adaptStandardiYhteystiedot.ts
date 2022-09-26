import { DBProjekti, StandardiYhteystiedot } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { vaylaUserToYhteystieto } from "./vaylaUserToYhteystieto";

export default function adaptStandardiYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null
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
