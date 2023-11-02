import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../database/model";

export function adaptLausuntoPyynnot(
  _dbProjekti: DBProjekti,
  _lausuntoPyynnot: LausuntoPyynto[] | undefined | null
): API.LausuntoPyynto[] | undefined {
  return undefined;
}

export function adaptLausuntoPyynnonTaydennykset(
  _dbProjekti: DBProjekti,
  _lausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] | undefined | null
): API.LausuntoPyynnonTaydennys[] | undefined {
  return undefined;
}
