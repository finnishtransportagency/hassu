import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import { mapAineistoToInput } from "./mapAineistoToInput";

type SplittedAineistoInput = { poistettu: AineistoInput[]; lisatty: AineistoInput[] };

export const aineistoToSplittedAineistoInput = (aineistot?: Aineisto[] | null | undefined): SplittedAineistoInput => {
  const initialSplittedAineistoInput: SplittedAineistoInput = { poistettu: [], lisatty: [] };
  return (
    aineistot?.map(mapAineistoToInput).reduce<SplittedAineistoInput>(reduceToLisatytJaPoistetut, initialSplittedAineistoInput) ||
    initialSplittedAineistoInput
  );
};

export const reduceToLisatytJaPoistetut = (
  acc: { poistettu: AineistoInput[]; lisatty: AineistoInput[] },
  aineisto: AineistoInput
): { poistettu: AineistoInput[]; lisatty: AineistoInput[] } => {
  if (aineisto.tila === AineistoTila.ODOTTAA_POISTOA || aineisto.tila === AineistoTila.POISTETTU) {
    acc.poistettu.push(aineisto);
  } else {
    acc.lisatty.push(aineisto);
  }
  return acc;
};
