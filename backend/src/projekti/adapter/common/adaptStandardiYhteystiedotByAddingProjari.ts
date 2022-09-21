import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiRooli } from "../../../../../common/graphql/apiModel";
import { StandardiYhteystiedot, DBVaylaUser } from "../../../database/model";
import { adaptYhteystiedotByAddingTypename } from "./lisaaTypename";

export function adaptStandardiYhteystiedotByAddingProjari(
  kayttoOikeudet: DBVaylaUser[],
  yhteystiedot: StandardiYhteystiedot
): API.StandardiYhteystiedot {
  if (yhteystiedot) {
    const yhteysHenkilot = yhteystiedot.yhteysHenkilot || [];
    const projari = kayttoOikeudet.find(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
    if (!yhteysHenkilot.find((kayttajatunnus) => kayttajatunnus === projari.kayttajatunnus)) {
      yhteysHenkilot.push(projari.kayttajatunnus);
    }
    return {
      __typename: "StandardiYhteystiedot",
      yhteysTiedot: adaptYhteystiedotByAddingTypename(yhteystiedot.yhteysTiedot),
      yhteysHenkilot,
    };
  }
  return yhteystiedot as undefined;
}
