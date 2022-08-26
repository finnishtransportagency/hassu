import { Yhteystieto } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";

export function adaptYhteystiedot(
  projektiPaallikko: Yhteystieto,
  yhteystiedot: Yhteystieto[]
): API.Yhteystieto[] | undefined | null {
  if (yhteystiedot) {
    let yhteystiedotProjektiPaallikonKanssa = yhteystiedot;
    if (!yhteystiedot.find((yt) => yt.sahkoposti === projektiPaallikko.sahkoposti)) {
      yhteystiedotProjektiPaallikonKanssa = [projektiPaallikko].concat(yhteystiedot);
    }
    return yhteystiedotProjektiPaallikonKanssa.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
  }
  return yhteystiedot as undefined | null;
}
