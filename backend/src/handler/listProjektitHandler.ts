import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import { ListaaProjektitInput, ProjektiHakutulos } from "../../../common/graphql/apiModel";

export async function listProjektit(input: ListaaProjektitInput): Promise<ProjektiHakutulos> {
  return projektiSearchService.search(input);
}
