import { AineistoInput } from "@services/api";
import { kategorisoimattomatId } from "common/aineistoKategoriat";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

export const getDefaultValueForAineistoNahtavilla = (aineistot: AineistoInput[] | undefined | null, kategoriaIds: string[]) => {
  const initialAineistoKategorias = kategoriaIds.reduce<AineistoNahtavilla>((acc, kategoriaId) => {
    acc[kategoriaId] = [];
    return acc;
  }, {});

  return (
    aineistot?.reduce<AineistoNahtavilla>((aineistoNahtavilla, aineisto) => {
      const kategoria = aineisto.kategoriaId && kategoriaIds.includes(aineisto.kategoriaId) ? aineisto.kategoriaId : kategorisoimattomatId;
      const aineistoToAdd =
        typeof aineisto.jarjestys !== "number" ? { ...aineisto, jarjestys: aineistoNahtavilla[kategoria].length } : aineisto;
      aineistoNahtavilla[kategoria].push(aineistoToAdd);
      return aineistoNahtavilla;
    }, initialAineistoKategorias) ?? initialAineistoKategorias
  );
};
