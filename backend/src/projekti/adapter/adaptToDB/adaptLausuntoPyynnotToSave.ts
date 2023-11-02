import * as API from "hassu-common/graphql/apiModel";
import { LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";

export function adaptLausuntoPyynnotToSave(
  _dbLausuntoPyynnot: LausuntoPyynto[] | undefined | null,
  _lausuntoPyynnot: API.LausuntoPyyntoInput[] | undefined | null,
  _projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynto[] | undefined {
  throw new Error("Not implemented yet");
}

export function adaptLausuntoPyynnonTaydennyksetToSave(
  _dbLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] | undefined | null,
  _lausuntoPyynnonTaydennykset: API.LausuntoPyynnonTaydennysInput[] | undefined | null,
  _projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys[] | undefined {
  throw new Error("Not implemented yet");
}
