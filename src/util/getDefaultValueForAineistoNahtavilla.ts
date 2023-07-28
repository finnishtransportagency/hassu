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
        const aineistoToAdd =
          typeof aineisto.jarjestys !== "number" ? { ...aineisto, jarjestys: aineistoNahtavilla[aineisto.kategoriaId].length } : aineisto;
        aineistoNahtavilla[aineisto.kategoriaId].push(aineistoToAdd);
      } else {
        const aineistoToAdd =
          typeof aineisto.jarjestys !== "number" ? { ...aineisto, jarjestys: aineistoNahtavilla[kategorisoimattomatId].length } : aineisto;
        aineistoNahtavilla[kategorisoimattomatId].push(aineistoToAdd);
      }
      return aineistoNahtavilla;
    }, initialAineistoKategorias) || initialAineistoKategorias
  );
};
