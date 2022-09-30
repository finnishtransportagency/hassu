import * as API from "../../../../../common/graphql/apiModel";
import { KayttajaTyyppi } from "../../../../../common/graphql/apiModel";
import { DBVaylaUser, StandardiYhteystiedot } from "../../../database/model";
import { adaptYhteystiedotByAddingTypename } from "./lisaaTypename";

export function adaptStandardiYhteystiedotByAddingProjari(
  kayttoOikeudet: DBVaylaUser[],
  yhteystiedot: StandardiYhteystiedot | undefined
): API.StandardiYhteystiedot {
  const yhteysHenkilot = yhteystiedot?.yhteysHenkilot || [];
  const projari = kayttoOikeudet.find(({ tyyppi }) => tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
  if (!projari) {
    throw new Error("Jotain on pahasti pielessä: Projektin kayttiOikeuksista puuttui projektipäällikkö");
  }
  if (!yhteysHenkilot.find((kayttajatunnus) => kayttajatunnus === projari.kayttajatunnus)) {
    yhteysHenkilot.push(projari.kayttajatunnus);
  }
  return {
    __typename: "StandardiYhteystiedot",
    yhteysTiedot: adaptYhteystiedotByAddingTypename(yhteystiedot?.yhteysTiedot),
    yhteysHenkilot,
  };
}
