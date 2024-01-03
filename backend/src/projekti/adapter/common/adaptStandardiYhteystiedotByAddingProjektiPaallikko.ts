import * as API from "hassu-common/graphql/apiModel";
import { KayttajaTyyppi } from "hassu-common/graphql/apiModel";
import { DBVaylaUser, StandardiYhteystiedot, SuunnitteluSopimus } from "../../../database/model";
import { adaptYhteystiedotByAddingTypename } from "./lisaaTypename";

export function adaptStandardiYhteystiedotByAddingProjektiPaallikko(
  kayttoOikeudet: DBVaylaUser[],
  yhteystiedot: StandardiYhteystiedot | undefined,
  suunnitteluSopimus?: SuunnitteluSopimus | null
): API.StandardiYhteystiedot {
  const yhteysHenkilot = yhteystiedot?.yhteysHenkilot ?? [];
  const projektipaallikko = kayttoOikeudet.find(({ tyyppi }) => tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
  if (suunnitteluSopimus?.yhteysHenkilo && !yhteysHenkilot.find((kayttajatunnus) => kayttajatunnus === suunnitteluSopimus.yhteysHenkilo)) {
    yhteysHenkilot.push(suunnitteluSopimus.yhteysHenkilo);
  } else if (projektipaallikko) {
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
