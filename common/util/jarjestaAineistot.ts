import { Aineisto } from "../../backend/src/database/model";

type GenericAineisto = Pick<Aineisto, "jarjestys">;
type AineistoSortFunction = (a: GenericAineisto, b: GenericAineisto) => number;

export const jarjestaAineistot: AineistoSortFunction = (a, b) => {
  if (typeof a.jarjestys !== "number" || typeof b.jarjestys !== "number") {
    return 0;
  } else if (a.jarjestys < b.jarjestys) {
    return -1;
  } else if (a.jarjestys > b.jarjestys) {
    return 1;
  } else {
    return 0;
  }
};
