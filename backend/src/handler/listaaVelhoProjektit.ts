import { requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";
import { ListaaVelhoProjektitQueryVariables, VelhoHakuTulos } from "../../../common/graphql/apiModel";

export async function listaaVelhoProjektit(params: ListaaVelhoProjektitQueryVariables): Promise<VelhoHakuTulos[]> {
  requireVaylaUser();

  return velho.searchProjects(params.nimi, params.requireExactMatch);
}
