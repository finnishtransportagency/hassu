import { Aineisto, AineistoTila } from "@services/api";
import { FormAineisto } from "./FormAineisto";

type SplittedAineistoInput = { poistettu: FormAineisto[]; lisatty: FormAineisto[] };

export const handleAineistoArrayForDefaultValues = (
  aineistot: Aineisto[] | null | undefined,
  addDefaultJarjestys: boolean
): SplittedAineistoInput => {
  const initialSplittedAineistoInput: SplittedAineistoInput = { poistettu: [], lisatty: [] };

  return (
    aineistot
      ?.map<FormAineisto>(({ dokumenttiOid, nimi, tila, uuid, jarjestys, kategoriaId, tiedosto, tuotu }) => ({
        dokumenttiOid,
        nimi,
        tila,
        uuid,
        jarjestys,
        kategoriaId,
        tiedosto,
        tuotu,
      }))
      ?.reduce<SplittedAineistoInput>(reduceToLisatytJaPoistetutAineistoInput(addDefaultJarjestys), initialSplittedAineistoInput) ||
    initialSplittedAineistoInput
  );
};

const reduceToLisatytJaPoistetutAineistoInput =
  (addDefaultJarjestys: boolean) =>
  (
    acc: { poistettu: FormAineisto[]; lisatty: FormAineisto[] },
    aineisto: FormAineisto
  ): { poistettu: FormAineisto[]; lisatty: FormAineisto[] } => {
    if (aineisto.tila === AineistoTila.ODOTTAA_POISTOA || aineisto.tila === AineistoTila.POISTETTU) {
      acc.poistettu.push(aineisto);
    } else {
      const aineistoToAdd =
        addDefaultJarjestys && typeof aineisto.jarjestys !== "number" ? { ...aineisto, jarjestys: acc.lisatty.length } : aineisto;
      acc.lisatty.push(aineistoToAdd);
    }
    return acc;
  };
