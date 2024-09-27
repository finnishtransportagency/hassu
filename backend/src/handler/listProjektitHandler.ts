import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import { ListaaProjektitInput, ProjektiHakutulos, ProjektiHakutulosJulkinen } from "hassu-common/graphql/apiModel";
import { getVaylaUser } from "../user";

export async function listProjektit(input: ListaaProjektitInput): Promise<ProjektiHakutulos | ProjektiHakutulosJulkinen> {
  if (getVaylaUser()) {
    return projektiSearchService.searchYllapito(input);
  }
  return projektiSearchService.searchJulkinen(input);
}
