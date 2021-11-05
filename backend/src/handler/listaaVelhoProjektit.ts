import { requirePermissionLuonti } from "../service/userService";
import { velho } from "../velho/velhoClient";
import { ListaaVelhoProjektitQueryVariables, VelhoHakuTulos } from "../../../common/graphql/apiModel";

export async function listaaVelhoProjektit(params: ListaaVelhoProjektitQueryVariables): Promise<VelhoHakuTulos[]> {
  requirePermissionLuonti();

  return velho.searchProjects(params.nimi, !!params.requireExactMatch);
}
