import { Aineisto } from "../../backend/src/database/model";

type GenericTiedosto = Pick<Aineisto, "jarjestys" | "nimi">;
type TiedostoSortFunction = (a: GenericTiedosto, b: GenericTiedosto) => number;

export const jarjestaTiedostot: TiedostoSortFunction = (a, b) => {
  if (typeof a.jarjestys !== "number" && typeof b.jarjestys !== "number") {
    return a.nimi.localeCompare(b.nimi);
  } else if (typeof a.jarjestys !== "number") {
    return 1;
  } else if (typeof b.jarjestys !== "number") {
    return -1;
  }
  return a.jarjestys - b.jarjestys;
};
