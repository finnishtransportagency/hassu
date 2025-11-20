import { requirePermissionLuonti } from "../user";
import { velho } from "../velho/velhoClient";
import { ListaaVelhoProjektitQueryVariables, VelhoHakuTulos } from "hassu-common/graphql/apiModel";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";

export async function listaaVelhoProjektit(params: ListaaVelhoProjektitQueryVariables): Promise<VelhoHakuTulos[]> {
  requirePermissionLuonti();

  const velhoHakuTulos = await searchProjektisFromVelho(params);
  const oidsInDatabase = await searchCorrespondingProjektisFromDatabase(velhoHakuTulos);

  return velhoHakuTulos.filter((hakuTulos) => !oidsInDatabase.includes(hakuTulos.oid));
}

async function searchProjektisFromVelho(params: ListaaVelhoProjektitQueryVariables) {
  return velho.searchProjects(params.nimi);
}

async function searchCorrespondingProjektisFromDatabase(velhoHakuTulos: VelhoHakuTulos[]) {
  return (await projektiSearchService.searchByOid(velhoHakuTulos.map((value) => value.oid))).map((projekti) => projekti.oid);
}
