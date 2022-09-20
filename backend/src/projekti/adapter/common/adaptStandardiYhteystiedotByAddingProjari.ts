import { ProjektiRooli } from "../../../../../common/graphql/apiModel";
import { StandardiYhteystiedot, DBVaylaUser } from "../../../database/model";

export function adaptStandardiYhteystiedotByAddingProjari(
  kayttoOikeudet: DBVaylaUser[],
  yhteystiedot: StandardiYhteystiedot
): StandardiYhteystiedot {
  if (yhteystiedot) {
    const yhteysHenkilot = yhteystiedot.yhteysHenkilot;
    const projari = kayttoOikeudet.find(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
    if (!yhteysHenkilot.find((kayttajatunnus) => kayttajatunnus === projari.kayttajatunnus)) {
      yhteysHenkilot.push(projari.kayttajatunnus);
    }
    return {
      ...yhteystiedot,
      yhteysHenkilot,
    };
  }
  return yhteystiedot as undefined;
}
