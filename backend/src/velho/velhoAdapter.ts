import { VelhoHakuTulos } from "../api/apiModel";

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
  return searchResults.map((result) => {
    return {
      oid: result.oid,
      name: result.ominaisuudet.nimi,
      type: adaptVaylamuoto(result.ominaisuudet.vaylamuoto),
    } as VelhoHakuTulos;
  });
}
