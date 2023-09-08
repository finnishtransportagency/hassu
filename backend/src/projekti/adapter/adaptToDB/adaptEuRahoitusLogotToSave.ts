import { DBProjekti } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";

export function adaptEuRahoitusLogotToSave(
  projekti: DBProjekti,
  euRahoitusLogotInput?: API.LokalisoituTekstiInputEiPakollinen | null,
  projektiAdaptationResult?: ProjektiAdaptationResult
): API.LokalisoituTekstiInput | null | undefined {
  if (euRahoitusLogotInput) {
    const { SUOMI, RUOTSI, ...rest } = euRahoitusLogotInput;
    if (euRahoitusLogotInput?.SUOMI || euRahoitusLogotInput?.RUOTSI) {
      projektiAdaptationResult?.logoFilesChanged();
    }
    return { ...rest, SUOMI: SUOMI || projekti.euRahoitusLogot?.SUOMI || "", RUOTSI: RUOTSI || projekti.euRahoitusLogot?.RUOTSI };
  }
  return euRahoitusLogotInput;
}
