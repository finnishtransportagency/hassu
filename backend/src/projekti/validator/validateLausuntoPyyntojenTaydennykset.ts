import { DBProjekti } from "../../database/model";
import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";

import { IllegalArgumentError } from "hassu-common/error";
import { validateTiedostoInput } from "./validateTiedostoInput";

export function validateLausuntoPyyntojenTaydennykset(projekti: DBProjekti, input: TallennaProjektiInput) {
  const dbLausuntoPyyntojenTaydennykset = projekti.lausuntoPyynnonTaydennykset;
  const inputLausuntoPyyntojenTaydennykset = input.lausuntoPyynnonTaydennykset;
  if (inputLausuntoPyyntojenTaydennykset === undefined) {
    return;
  }

  dbLausuntoPyyntojenTaydennykset?.some((dblp) => {
    const inputVastine = inputLausuntoPyyntojenTaydennykset?.find((lp) => lp.uuid == dblp.uuid);
    if (!inputVastine) {
      throw new IllegalArgumentError("Poistetut lausuntopyyntöjen täydennyksien aineistolinkit on merkittävä poistettaviksi inputissa.");
    }
    const dbMuuAineisto = dblp.muuAineisto;
    const inputMuuAineisto = inputVastine.muuAineisto;
    validateTiedostoInput(dbMuuAineisto, inputMuuAineisto);
    const dbMuistutukset = dblp.muistutukset;
    const inputMuistutukset = inputVastine.muistutukset;
    validateTiedostoInput(dbMuistutukset, inputMuistutukset);
  });
}
