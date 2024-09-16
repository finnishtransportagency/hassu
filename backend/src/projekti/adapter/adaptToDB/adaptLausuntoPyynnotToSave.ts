import * as API from "hassu-common/graphql/apiModel";
import { LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";
import { LausuntoPyynnotDB, adaptTiedostotToSave } from "./common";
import { log } from "../../../logger";

export function adaptLausuntoPyynnotToSave(
  dbLausuntoPyynnot: LausuntoPyynto[] | undefined | null,
  lausuntoPyyntoInput: API.LausuntoPyyntoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynto[] | undefined {
  if (!lausuntoPyyntoInput) {
    return undefined;
  }
  return lausuntoPyyntoInput
    .map(
      (lausuntoPyynto) =>
        adaptLausuntoPyyntoToSave(
          dbLausuntoPyynnot?.find((pyynto) => pyynto.uuid === lausuntoPyynto.uuid),
          lausuntoPyynto,
          projektiAdaptationResult
        ) as LausuntoPyynto
    )
    .concat(dbLausuntoPyynnot?.filter((lp) => !!lp.legacy) ?? []);
}

export function adaptLausuntoPyynnonTaydennyksetToSave(
  dbLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys[] | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  return lausuntoPyynnonTaydennysInput.map(
    (lausuntoPyynto) =>
      adaptLausuntoPyynnonTaydennysToSave(
        dbLausuntoPyynnonTaydennykset?.find((pyynto) => pyynto.uuid === lausuntoPyynto.uuid),
        lausuntoPyynto,
        projektiAdaptationResult
      ) as LausuntoPyynnonTaydennys
  );
}

export function adaptLausuntoPyyntoToSave(
  dbLausuntoPyynto: LausuntoPyynto | undefined | null,
  lausuntoPyyntoInput: API.LausuntoPyyntoInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynto | undefined {
  if (!lausuntoPyyntoInput) {
    return undefined;
  }
  if (lausuntoPyyntoInput.poistetaan) {
    projektiAdaptationResult.filesChanged();
  }
  if (!dbLausuntoPyynto && !lausuntoPyyntoInput.lisaAineistot?.length) {
    log.info("Lausuntopyyntö luodaan ja lisäaineistoa ei ole. Laukaistaan tiedoston muutoksella zip-paketin (pakettien) luominen.");
    projektiAdaptationResult.zipLausuntopyynnot();
  }
  const { lisaAineistot: dbLisaAineistot, ...restDbLP } = dbLausuntoPyynto ?? {};
  const { lisaAineistot, ...rest } = lausuntoPyyntoInput;
  const lisaAineistotAdapted = lausuntoPyyntoInput
    ? adaptTiedostotToSave(dbLisaAineistot, lisaAineistot, projektiAdaptationResult)
    : undefined;
  return mergeWith({}, { ...restDbLP }, { ...rest, lisaAineistot: lisaAineistotAdapted });
}

export function adaptLausuntoPyynnonTaydennysToSave(
  dbLausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  const { muuAineisto: dbMuuAineisto, muistutukset: dbMuistutukset, ...restDbLPT } = dbLausuntoPyynnonTaydennys ?? {};
  const { muuAineisto: muuAineistoInput, muistutukset: muistutuksetInput, ...restInput } = lausuntoPyynnonTaydennysInput;
  const muuAineisto = lausuntoPyynnonTaydennysInput
    ? adaptTiedostotToSave(dbMuuAineisto, muuAineistoInput, projektiAdaptationResult)
    : undefined;
  const muistutukset: LausuntoPyynnotDB = adaptTiedostotToSave(dbMuistutukset, muistutuksetInput, projektiAdaptationResult);
  if (lausuntoPyynnonTaydennysInput.poistetaan) projektiAdaptationResult.filesChanged();
  return mergeWith({}, { ...restDbLPT }, { ...restInput, muuAineisto, muistutukset });
}
