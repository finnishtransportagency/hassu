import { VelhoHakuTulos } from "../api/apiModel";
import { ProjektiProjekti } from "./projektirekisteri";

function adaptVaylamuoto(vaylamuodot: string[]) {
  return vaylamuodot
    .map((vaylamuoto) => {
      switch (vaylamuoto) {
        case "tie":
          return "Tiesuunnitelma";
        case "rata":
          return "Ratasuunnitelma";
        default:
          return vaylamuoto;
      }
    })
    .join(", ");
}

export function adaptSearchResults(searchResults: any): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result) => {
      return {
        oid: result.oid,
        name: result.ominaisuudet.nimi,
        type: adaptVaylamuoto(result.ominaisuudet.vaylamuoto),
      } as VelhoHakuTulos;
    });
  }
}

export function adaptProjecti(data: ProjektiProjekti) {
  return data;
}
