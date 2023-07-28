import { AineistoInput } from "@services/api";
import { aineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

export const getDefaultValueForAineistoNahtavilla = (aineistot: AineistoInput[] | undefined | null) => {
  const kategoriaIds = aineistoKategoriat.listKategoriaIds();
  const initialAineistoKategorias = aineistoKategoriat.listKategoriaIds().reduce<AineistoNahtavilla>((acc, kategoriaId) => {
    acc[kategoriaId] = [];
    return acc;
  }, {});

  return (
    aineistot?.reduce<AineistoNahtavilla>((aineistoNahtavilla, aineisto) => {
      if (aineisto.kategoriaId && kategoriaIds.includes(aineisto.kategoriaId)) {
        aineistoNahtavilla[aineisto.kategoriaId].push(aineisto);
      } else {
        aineistoNahtavilla[kategorisoimattomatId].push(aineisto);
      }
      return aineistoNahtavilla;
    }, initialAineistoKategorias) || initialAineistoKategorias
  );
};
