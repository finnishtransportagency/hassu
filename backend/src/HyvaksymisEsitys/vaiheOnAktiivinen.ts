import * as API from "hassu-common/graphql/apiModel";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { DBProjekti } from "../database/model";
import GetProjektiStatus from "../projekti/status/getProjektiStatus";

export default async function hyvaksymisEsitysVaiheOnAktiivinen(projekti: DBProjekti): Promise<boolean> {
  const status = await GetProjektiStatus.getProjektiStatus(projekti);
  return isStatusGreaterOrEqualTo(status, API.Status.NAHTAVILLAOLO_AINEISTOT);
}
