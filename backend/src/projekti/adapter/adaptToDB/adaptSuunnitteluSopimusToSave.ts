import { DBProjekti } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";

export function adaptSuunnitteluSopimusToSave(
  projekti: DBProjekti,
  suunnitteluSopimusInput?: API.SuunnitteluSopimusInput | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.SuunnitteluSopimusInput | null | undefined {
  if (suunnitteluSopimusInput) {
    const { logo, ...rest } = suunnitteluSopimusInput;
    if (suunnitteluSopimusInput?.logo) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, logo: logo || projekti.suunnitteluSopimus?.logo };
  }
  return suunnitteluSopimusInput;
}
