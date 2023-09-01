import { DBProjekti } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";

export function adaptEuRahoitusLogotToSave(
  projekti: DBProjekti,
  euRahoitusLogotInput?: API.EuRahoitusLogotInput | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.EuRahoitusLogotInput | null | undefined {
  if (euRahoitusLogotInput) {
    const { logoFI, logoSV, ...rest } = euRahoitusLogotInput;
    if (euRahoitusLogotInput?.logoFI || euRahoitusLogotInput?.logoSV) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, logoFI: logoFI || projekti.euRahoitusLogot?.logoFI, logoSV: logoSV || projekti.euRahoitusLogot?.logoSV };
  }
  return euRahoitusLogotInput;
}
