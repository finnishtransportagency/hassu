import { DBProjekti, StandardiYhteystiedot, Yhteystieto } from "../database/model";
import { ProjektiRooli } from "../../../common/graphql/apiModel";
import { vaylaUserToYhteystieto } from "../util/vaylaUserToYhteystieto";

export default function adaptStandardiYhteystiedot(
  dbProjekti: DBProjekti,
  kuulutusYhteystiedot: StandardiYhteystiedot | null
): Yhteystieto[] {
  const yt: Yhteystieto[] = [];
  const sahkopostit: string[] = [];
  dbProjekti.kayttoOikeudet
    .filter(
      ({ kayttajatunnus, rooli }) =>
        rooli === ProjektiRooli.PROJEKTIPAALLIKKO || kuulutusYhteystiedot?.yhteysHenkilot?.find((yh) => yh === kayttajatunnus)
    )
    .forEach((oikeus) => {
      yt.push(vaylaUserToYhteystieto(oikeus));
      sahkopostit.push(oikeus.email); //Kerää sähköpostit myöhempää duplikaattien tarkistusta varten.
    });
  if (kuulutusYhteystiedot.yhteysTiedot) {
    kuulutusYhteystiedot.yhteysTiedot.forEach((yhteystieto) => {
      if (!sahkopostit.find((email) => email === yhteystieto.sahkoposti)) {
        //Varmista, ettei ole duplikaatteja
        yt.push(yhteystieto);
        sahkopostit.push(yhteystieto.sahkoposti);
      }
    });
  }
  return yt;
}
