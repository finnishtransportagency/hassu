import { AineistoInput, AineistoTila } from "@services/api";

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
