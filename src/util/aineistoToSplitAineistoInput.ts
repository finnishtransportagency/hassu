import { Aineisto, AineistoInput } from "@services/api";
import { mapAineistoToInput } from "./mapAineistoToInput";
import { reduceToLisatytJaPoistetut } from "./reduceToLisatytJaPoistetut";

type SplittedAineistoInput = { poistettu: AineistoInput[]; lisatty: AineistoInput[] };

const initialSplittedAineistoInput: SplittedAineistoInput = { poistettu: [], lisatty: [] };

export const aineistoToSplitAineistoInput = (aineistot?: Aineisto[] | null | undefined): SplittedAineistoInput =>
  aineistot?.map(mapAineistoToInput).reduce(reduceToLisatytJaPoistetut, initialSplittedAineistoInput) || initialSplittedAineistoInput;
