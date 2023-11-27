import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import { mapAineistoToInput } from "./mapAineistoToInput";

type SplittedAineistoInput = { poistettu: AineistoInput[]; lisatty: AineistoInput[] };

export const handleAineistoArrayForDefaultValues = (
  aineistot: Aineisto[] | null | undefined,
  addDefaultJarjestys: boolean
): SplittedAineistoInput => {
  const initialSplittedAineistoInput: SplittedAineistoInput = { poistettu: [], lisatty: [] };

  return (
    aineistot
      ?.map(mapAineistoToInput)
      .reduce<SplittedAineistoInput>(reduceToLisatytJaPoistetutAineistoInput(addDefaultJarjestys), initialSplittedAineistoInput) ||
    initialSplittedAineistoInput
  );
};

const reduceToLisatytJaPoistetutAineistoInput =
  (addDefaultJarjestys: boolean) =>
  (
    acc: { poistettu: AineistoInput[]; lisatty: AineistoInput[] },
    aineisto: AineistoInput
  ): { poistettu: AineistoInput[]; lisatty: AineistoInput[] } => {
    if (aineisto.tila === AineistoTila.ODOTTAA_POISTOA || aineisto.tila === AineistoTila.POISTETTU) {
      acc.poistettu.push(aineisto);
    } else {
      const aineistoToAdd =
        addDefaultJarjestys && typeof aineisto.jarjestys !== "number" ? { ...aineisto, jarjestys: acc.lisatty.length } : aineisto;
      acc.lisatty.push(aineistoToAdd);
    }
    return acc;
  };
