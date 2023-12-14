import { LadattuTiedosto, LadattuTiedostoInput, LadattuTiedostoTila } from "@services/api";
import { LadattuTiedostoInputWithTuotu, SplitLadattuTiedostoInput } from "./types";
import find from "lodash/find";

export const handleLadattuTiedostoArrayForDefaultValues = (
  aineistot: LadattuTiedosto[] | null | undefined,
  addDefaultJarjestys: boolean
): SplitLadattuTiedostoInput => {
  const initialSplitLadattuTiedostoInput: SplitLadattuTiedostoInput = {
    poistettu: [] as LadattuTiedostoInputWithTuotu[],
    lisatty: [] as LadattuTiedostoInputWithTuotu[],
  };

  return (
    aineistot
      ?.map(mapLadattuTiedostoToInput)
      .reduce(reduceToLisatytJaPoistetutLadattuTiedosto(addDefaultJarjestys), initialSplitLadattuTiedostoInput) ||
    initialSplitLadattuTiedostoInput
  );
};

export const reduceToLisatytJaPoistetutLadattuTiedosto =
  (addDefaultJarjestys: boolean) =>
  (
    acc: { poistettu: LadattuTiedostoInput[]; lisatty: LadattuTiedostoInput[] },
    tiedosto: LadattuTiedostoInput
  ): { poistettu: LadattuTiedostoInput[]; lisatty: LadattuTiedostoInput[] } => {
    if (tiedosto.tila === LadattuTiedostoTila.ODOTTAA_POISTOA || tiedosto.tila === LadattuTiedostoTila.POISTETTU) {
      acc.poistettu.push(tiedosto);
    } else {
      const aineistoToAdd =
        addDefaultJarjestys && typeof tiedosto.jarjestys !== "number" ? { ...tiedosto, jarjestys: acc.lisatty.length } : tiedosto;
      acc.lisatty.push(aineistoToAdd);
    }
    return acc;
  };

const mapLadattuTiedostoToInput = ({ nimi, jarjestys, tila, tiedosto, tuotu }: LadattuTiedosto): LadattuTiedostoInputWithTuotu => ({
  tiedosto,
  jarjestys,
  nimi,
  tila,
  tuotu,
});

export function combineOldAndNewLadattuTiedosto({
  oldTiedostot,
  oldPoistetut,
  newTiedostot,
}: {
  oldTiedostot?: LadattuTiedostoInputWithTuotu[];
  oldPoistetut?: LadattuTiedostoInputWithTuotu[];
  newTiedostot: LadattuTiedostoInputWithTuotu[];
}) {
  return newTiedostot.reduce<{ lisatyt: LadattuTiedostoInputWithTuotu[]; poistetut: LadattuTiedostoInputWithTuotu[] }>(
    (acc, tiedosto) => {
      if (!find(acc.lisatyt, { nimi: tiedosto.nimi })) {
        acc.lisatyt.push({ ...tiedosto, jarjestys: acc.lisatyt.length });
      }
      acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.nimi !== tiedosto.nimi);
      return acc;
    },
    { lisatyt: oldTiedostot || [], poistetut: oldPoistetut || [] }
  );
}
