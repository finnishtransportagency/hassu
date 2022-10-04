import * as API from "../../../../../common/graphql/apiModel";
import { KayttajaTyyppi } from "../../../../../common/graphql/apiModel";
import { DBVaylaUser, StandardiYhteystiedot } from "../../../database/model";
import { adaptYhteystiedotByAddingTypename } from "./lisaaTypename";

export function adaptStandardiYhteystiedotByAddingProjektiPaallikko(
  kayttoOikeudet: DBVaylaUser[],
  yhteystiedot: StandardiYhteystiedot | undefined
): API.StandardiYhteystiedot {
  const yhteysHenkilot = yhteystiedot?.yhteysHenkilot || [];
  const projektipaallikko = kayttoOikeudet.find(({ tyyppi }) => tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
  if (projektipaallikko) {
    if (!yhteysHenkilot.find((kayttajatunnus) => kayttajatunnus === projektipaallikko.kayttajatunnus)) {
      yhteysHenkilot.push(projektipaallikko.kayttajatunnus);
    }
  }
  return {
    __typename: "StandardiYhteystiedot",
    yhteysTiedot: adaptYhteystiedotByAddingTypename(yhteystiedot?.yhteysTiedot),
    yhteysHenkilot,
  };
}
