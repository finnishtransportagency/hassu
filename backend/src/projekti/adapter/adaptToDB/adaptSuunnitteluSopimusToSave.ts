import { DBProjekti } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { adaptLokalisoituTekstiEiPakollinen } from "./common";

export function adaptSuunnitteluSopimusToSave(
  projekti: DBProjekti,
  suunnitteluSopimusInput?: API.SuunnitteluSopimusInput | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.SuunnitteluSopimusInput | null | undefined {
  if (suunnitteluSopimusInput) {
    const { logo, ...rest } = suunnitteluSopimusInput;
    return {
      ...rest,
      logo: adaptLokalisoituTekstiEiPakollinen(projekti.suunnitteluSopimus?.logo, logo, projektiAdaptationResult),
    };
  }
  return suunnitteluSopimusInput;
}
