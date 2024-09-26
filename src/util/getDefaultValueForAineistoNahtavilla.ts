import { FormAineisto } from "./FormAineisto";
import { kategorisoimattomatId } from "common/aineistoKategoriat";

interface AineistoNahtavilla {
  [kategoriaId: string]: FormAineisto[];
}

export const getDefaultValueForAineistoNahtavilla = (aineistot: FormAineisto[] | undefined | null, kategoriaIds: string[]) => {
  const initialAineistoKategorias = kategoriaIds.reduce<AineistoNahtavilla>((acc, kategoriaId) => {
    acc[kategoriaId] = [];
    return acc;
  }, {});

  return (
    aineistot?.reduce<AineistoNahtavilla>((aineistoNahtavilla, aineisto) => {
      const kategoriaId =
        aineisto.kategoriaId && kategoriaIds.includes(aineisto.kategoriaId) ? aineisto.kategoriaId : kategorisoimattomatId;
      const aineistoToAdd: FormAineisto = {
        ...aineisto,
        jarjestys: typeof aineisto.jarjestys === "number" ? aineisto.jarjestys : aineistoNahtavilla[kategoriaId].length,
        kategoriaId,
      };
      aineistoNahtavilla[kategoriaId].push(aineistoToAdd);
      return aineistoNahtavilla;
    }, initialAineistoKategorias) ?? initialAineistoKategorias
  );
};
