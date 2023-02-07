import { DBProjekti } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptEuRahoitusLogotToSave(
  projekti: DBProjekti,
  euRahoitusLogotInput?: API.EuRahoitusLogotInput | null
): API.EuRahoitusLogotInput | null | undefined {
  if (euRahoitusLogotInput) {
    const { logoFI, logoSV, ...rest } = euRahoitusLogotInput;
    return { ...rest, logoFI: logoFI || projekti.euRahoitusLogot?.logoFI, logoSV: logoSV || projekti.euRahoitusLogot?.logoSV };
  }
  return euRahoitusLogotInput;
}
