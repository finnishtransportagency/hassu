import {
  HyvaksymisesitysInput,
  LadattuTiedosto,
  LadattuTiedostoInput,
  LausuntoPyyntoInput,
  TallennaProjektiInput,
} from "@services/api";
import { FieldArrayWithId } from "react-hook-form";
import { handleLadattuTiedostoArraysForSave } from "src/util/handleLadattuTiedostoArraysForSave";

export type LadattuTiedostoInputWithTuotu = LadattuTiedostoInput & { tuotu?: string | null };
export type SplitLadattuTiedostoInput = { poistettu: LadattuTiedostoInput[]; lisatty: LadattuTiedostoInput[] };
export type FormLadattuTiedosto = FieldArrayWithId<LausuntoPyyntoInput, "lisaAineistot", "id"> & Pick<LadattuTiedosto, "tuotu">;

export type HyvaksymisesitysLisakentilla = Omit<
  HyvaksymisesitysInput,
  | "suunnitelma"
  | "muistutukset"
  | "lausunnot"
  | "maanomistajaluettelo"
  | "kuulutuksetJaKutsut"
  | "muuAineistoLadattu"
> & {
  suunnitelma: LadattuTiedostoInput[];
  poistettuSuunnitelma: LadattuTiedostoInput[];
  muistutukset: LadattuTiedostoInput[];
  poistetutMuistutukset: LadattuTiedostoInput[];
  lausunnot: LadattuTiedostoInput[];
  poistetutLausunnot: LadattuTiedostoInput[];
  maanomistajaluettelo: LadattuTiedostoInput[];
  poistettuMaanomistajaluettelo: LadattuTiedostoInput[];
  kuulutuksetJaKutsut: LadattuTiedostoInput[];
  poistetutKuulutuksetJaKutsut: LadattuTiedostoInput[];
  muuAineistoLadattu: LadattuTiedostoInput[];
  poistetutMuuAineistoLadattu: LadattuTiedostoInput[];
  tallennettu: boolean;
};
type HyvaksymisesitysFormData = {
  hyvaksymisesitykset: HyvaksymisesitysLisakentilla[];
  poistetutHyvaksymisesitykset: HyvaksymisesitysLisakentilla[];
};

type HyvaksymisesitysCompleteFormData = Pick<TallennaProjektiInput, "oid" | "versio"> & HyvaksymisesitysFormData;

export type HyvaksymisesitysFormValues = Required<{
  [K in keyof HyvaksymisesitysCompleteFormData]: NonNullable<HyvaksymisesitysCompleteFormData[K]>;
}>;

export function adaptHyvaksymisesitysLisakentillaToHyvaksymisesitysInput(lausuntoPyynto: HyvaksymisesitysLisakentilla) {
  const {
    suunnitelma,
    poistettuSuunnitelma,
    muistutukset,
    poistetutMuistutukset,
    lausunnot,
    poistetutLausunnot,
    maanomistajaluettelo,
    poistettuMaanomistajaluettelo,
    kuulutuksetJaKutsut,
    poistetutKuulutuksetJaKutsut,
    muuAineistoLadattu,
    poistetutMuuAineistoLadattu: poistettuMuuAineistoLadattu,
    tallennettu,
    ...rest
  } = lausuntoPyynto;
  return {
    ...rest,
    suunnitelma: handleLadattuTiedostoArraysForSave(suunnitelma, poistettuSuunnitelma),
    muistutukset: handleLadattuTiedostoArraysForSave(muistutukset, poistetutMuistutukset),
    lausunnot: handleLadattuTiedostoArraysForSave(lausunnot, poistetutLausunnot),
    maanomistajaluettelo: handleLadattuTiedostoArraysForSave(maanomistajaluettelo, poistettuMaanomistajaluettelo),
    kuulutuksetJaKutsut: handleLadattuTiedostoArraysForSave(kuulutuksetJaKutsut, poistetutKuulutuksetJaKutsut),
    muuAineistoLadattu: handleLadattuTiedostoArraysForSave(muuAineistoLadattu, poistettuMuuAineistoLadattu),
  };
}
export const mapHyvaksymisesitysFormValuesToHyvaksymisesitysInput = (
  hyvaksymisesitysFormData: HyvaksymisesitysFormValues
): TallennaProjektiInput => {
  const input: TallennaProjektiInput = {
    oid: hyvaksymisesitysFormData.oid,
    versio: hyvaksymisesitysFormData.versio,
  };

  const hyvaksymisesitykset = hyvaksymisesitysFormData.hyvaksymisesitykset.map(adaptHyvaksymisesitysLisakentillaToHyvaksymisesitysInput);
  const poistetutHyvaksymisesitykset = hyvaksymisesitysFormData.poistetutHyvaksymisesitykset.map(
    adaptHyvaksymisesitysLisakentillaToHyvaksymisesitysInput
  );

  input.hyvaksymisesitys = hyvaksymisesitykset.concat(poistetutHyvaksymisesitykset);
  return input;
};

