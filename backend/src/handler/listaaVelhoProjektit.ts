import { requirePermissionLuonti } from "../user";
import { velho } from "../velho/velhoClient";
import { ListaaVelhoProjektitQueryVariables, VelhoHakuTulos } from "../../../common/graphql/apiModel";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { ProjektiIllegalAccessError } from "../error/ProjektiIllegalAccessError";

function checkUserRightsError(e: Error) {
  if (e instanceof IllegalAccessError) {
    return new ProjektiIllegalAccessError(e.message);
  }
}

export async function listaaVelhoProjektit(params: ListaaVelhoProjektitQueryVariables): Promise<VelhoHakuTulos[]> {
  try {
    requirePermissionLuonti();
  } catch (e) {
    const userRightsError = checkUserRightsError(e as Error);
    if (userRightsError) {
      throw userRightsError;
    }
    throw e;
  }
  const velhoHakuTulos = await searchProjektisFromVelho(params);
  const oidsInDatabase = await searchCorrespondingProjektisFromDatabase(velhoHakuTulos);

  return velhoHakuTulos.filter((hakuTulos) => !oidsInDatabase.includes(hakuTulos.oid));
}

async function searchProjektisFromVelho(params: ListaaVelhoProjektitQueryVariables) {
  return velho.searchProjects(params.nimi, !!params.requireExactMatch);
}

async function searchCorrespondingProjektisFromDatabase(velhoHakuTulos: VelhoHakuTulos[]) {
  return (await projektiSearchService.searchByOid(velhoHakuTulos.map((value) => value.oid))).map((projekti) => projekti.oid);
}
