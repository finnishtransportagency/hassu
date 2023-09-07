import { Aineisto } from "../../backend/src/database/model";

type GenericAineisto = Pick<Aineisto, "jarjestys" | "nimi">;
type AineistoSortFunction = (a: GenericAineisto, b: GenericAineisto) => number;

export const jarjestaAineistot: AineistoSortFunction = (a, b) => {
  if (typeof a.jarjestys !== "number" && typeof b.jarjestys !== "number") {
    return a.nimi.localeCompare(b.nimi);
  } else if (typeof a.jarjestys !== "number") {
    return 1;
  } else if (typeof b.jarjestys !== "number") {
    return -1;
  }
  return a.jarjestys - b.jarjestys;
};
