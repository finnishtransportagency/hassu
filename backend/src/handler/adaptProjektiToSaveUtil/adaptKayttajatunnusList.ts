import { DBProjekti } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";

export function adaptKayttajatunnusList(
  projekti: DBProjekti,
  yhteysHenkilot: Array<string>,
  doNotForceProjektipaallikko?: boolean
): string[] | undefined {
  if (!yhteysHenkilot || yhteysHenkilot.length == 0) {
    return undefined;
  }
  // Include only usernames that can be found from projekti
  const unfilteredList = yhteysHenkilot.map((yh) => {
    const projektiUser = projekti.kayttoOikeudet.find((value) => value.kayttajatunnus == yh);
    if (projektiUser) {
      return yh;
    } else {
      return undefined;
    }
  });

  // Users with PROJEKTIPAALLIKKO role should always be in the kayttajaTunnusList
  // Push PROJEKTIPAALLIKKO into the list if not there already
  const projektipaallikkonTunnus = projekti.kayttoOikeudet?.find(
    ({ rooli }) => rooli === API.ProjektiRooli.PROJEKTIPAALLIKKO
  )?.kayttajatunnus;
  if (!doNotForceProjektipaallikko && !unfilteredList.includes(projektipaallikkonTunnus)) {
    unfilteredList.push(projektipaallikkonTunnus);
  }

  const list = unfilteredList.filter((yh) => yh);
  return list.length > 0 ? list : undefined;
}
