import { LadattuTiedosto, LadattuTiedostoInput, LadattuTiedostoTila } from "@services/api";
import { LadattuTiedostoInputWithTuotu, SplitLadattuTiedostoInput } from "./types";

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

const mapLadattuTiedostoToInput = ({ nimi, jarjestys, tila, tiedosto, tuotu, uuid }: LadattuTiedosto): LadattuTiedostoInputWithTuotu => ({
  tiedosto,
  jarjestys,
  nimi,
  tila,
  tuotu,
  uuid,
});
