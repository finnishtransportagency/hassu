import * as API from "hassu-common/graphql/apiModel";
import { Status } from "hassu-common/graphql/apiModel";

export function isProjektiJulkinenStatusPublic(status: API.Status) {
  const notPublicStatuses = [Status.EI_JULKAISTU, Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3];
  return !notPublicStatuses.includes(status);
}
