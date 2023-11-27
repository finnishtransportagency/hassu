import {
  LadattuTiedosto,
  LadattuTiedostoInput,
  LausuntoPyynnonTaydennysInput,
  LausuntoPyyntoInput,
  TallennaProjektiInput,
} from "@services/api";
import { FieldArrayWithId } from "react-hook-form";
import { handleLadattuTiedostoArraysForSave } from "src/util/handleLadattuTiedostoArraysForSave";

export type LadattuTiedostoInputWithTuotu = LadattuTiedostoInput & { tuotu?: string | null };
export type SplitLadattuTiedostoInput = { poistettu: LadattuTiedostoInput[]; lisatty: LadattuTiedostoInput[] };
export type FormLadattuTiedosto = FieldArrayWithId<LausuntoPyyntoInput, "lisaAineistot", "id"> & Pick<LadattuTiedosto, "tuotu">;

// Lausuntopyynnöt

export type LausuntoPyyntoLisakentilla = Omit<LausuntoPyyntoInput, "lisaAineistot"> & {
  lisaAineistot: LadattuTiedostoInput[];
  poistetutLisaAineistot: LadattuTiedostoInput[];
  tallennettu: boolean;
};
type LausuntoPyynnotFormData = {
  lausuntoPyynnot: LausuntoPyyntoLisakentilla[];
  poistetutLausuntoPyynnot: LausuntoPyyntoLisakentilla[];
};

type LausuntoPyynnotCompleteFormData = Pick<TallennaProjektiInput, "oid" | "versio"> & LausuntoPyynnotFormData;

export type LausuntoPyynnotFormValues = Required<{
  [K in keyof LausuntoPyynnotCompleteFormData]: NonNullable<LausuntoPyynnotCompleteFormData[K]>;
}>;

export function adaptLausuntoPyyntoLisakentillaToLausuntoPyyntoInput(lausuntoPyynto: LausuntoPyyntoLisakentilla) {
  const { poistetutLisaAineistot, lisaAineistot, tallennettu, ...rest } = lausuntoPyynto;
  return {
    ...rest,
    lisaAineistot: handleLadattuTiedostoArraysForSave(lisaAineistot, poistetutLisaAineistot),
  };
}
export const mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput = (
  lausuntoPyynnotFormData: LausuntoPyynnotFormValues
): TallennaProjektiInput => {
  const input: TallennaProjektiInput = {
    oid: lausuntoPyynnotFormData.oid,
    versio: lausuntoPyynnotFormData.versio,
  };

  const lausuntoPyynnot = lausuntoPyynnotFormData.lausuntoPyynnot.map(adaptLausuntoPyyntoLisakentillaToLausuntoPyyntoInput);
  const poistetutLausuntoPyynnot = lausuntoPyynnotFormData.poistetutLausuntoPyynnot.map(
    adaptLausuntoPyyntoLisakentillaToLausuntoPyyntoInput
  );

  input.lausuntoPyynnot = lausuntoPyynnot.concat(poistetutLausuntoPyynnot);
  return input;
};

// Lausuntopyynnön täydennykset

export type LausuntoPyynnonTaydennysLisakentilla = Omit<LausuntoPyynnonTaydennysInput, "muuAineisto" | "muistutukset"> & {
  muuAineisto: LadattuTiedostoInputWithTuotu[];
  poistetutMuuAineisto: LadattuTiedostoInputWithTuotu[];
  muistutukset: LadattuTiedostoInputWithTuotu[];
  poistetutMuistutukset: LadattuTiedostoInputWithTuotu[];
  tallennettu: boolean;
};
type LausuntoPyynnonTaydennyksetFormData = {
  lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennysLisakentilla[];
  poistetutLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennysLisakentilla[];
};
type LausuntoPyynnonTaydennysCompleteFormData = Pick<TallennaProjektiInput, "oid" | "versio"> & LausuntoPyynnonTaydennyksetFormData;

export type LausuntoPyynnonTaydennysFormValues = Required<{
  [K in keyof LausuntoPyynnonTaydennysCompleteFormData]: NonNullable<LausuntoPyynnonTaydennysCompleteFormData[K]>;
}>;

export function adaptLausuntoPyynnonTaydennysLisakentillaToInput(lausuntoPyynto: LausuntoPyynnonTaydennysLisakentilla) {
  const { poistetutMuuAineisto, muuAineisto, muistutukset, poistetutMuistutukset, tallennettu, ...rest } = lausuntoPyynto;
  return {
    ...rest,
    muuAineisto: handleLadattuTiedostoArraysForSave(muuAineisto, poistetutMuuAineisto),
    muistutukset: handleLadattuTiedostoArraysForSave(muistutukset, poistetutMuistutukset),
  };
}

export const mapLausuntoPyynnonTaydennysFormValuesToLausuntoPyyntoInput = (
  lausuntoPyynnotFormData: LausuntoPyynnonTaydennysFormValues
): TallennaProjektiInput => {
  const input: TallennaProjektiInput = {
    oid: lausuntoPyynnotFormData.oid,
    versio: lausuntoPyynnotFormData.versio,
  };

  const lausuntoPyynnonTaydennykset = lausuntoPyynnotFormData.lausuntoPyynnonTaydennykset.map(
    adaptLausuntoPyynnonTaydennysLisakentillaToInput
  );
  const poistetutLausuntoPyynnonTaydennykset = lausuntoPyynnotFormData.poistetutLausuntoPyynnonTaydennykset.map(
    adaptLausuntoPyynnonTaydennysLisakentillaToInput
  );

  input.lausuntoPyynnonTaydennykset = lausuntoPyynnonTaydennykset.concat(poistetutLausuntoPyynnonTaydennykset);
  return input;
};
