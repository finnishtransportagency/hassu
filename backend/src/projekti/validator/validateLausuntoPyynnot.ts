import { DBProjekti } from "../../database/model";
import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { validateTiedostoInput } from "./validateTiedostoInput";

export function validateLausuntoPyynnot(projekti: DBProjekti, input: TallennaProjektiInput) {
  const dbLausuntoPyynnot = projekti.lausuntoPyynnot;
  const inputLausuntoPyynnot = input.lausuntoPyynnot;
  const legacyLausuntoPyyntoUuids = dbLausuntoPyynnot?.filter((lp) => lp.legacy).map((lp) => lp.uuid);
  if (inputLausuntoPyynnot === undefined) {
    return;
  }

  if (inputLausuntoPyynnot?.some((lp) => legacyLausuntoPyyntoUuids?.includes(lp.uuid))) {
    throw new IllegalArgumentError("Et voi muokata vanhassa järjestelmässä luotuja lisäaineistoja");
  }

  dbLausuntoPyynnot?.some((dblp) => {
    const inputVastine = inputLausuntoPyynnot?.find((lp) => lp.uuid == dblp.uuid);
    if (dblp.legacy) {
      return;
    }
    if (!inputVastine) {
      throw new IllegalArgumentError("Poistetut lausuntopyyntöjen aineistolinkit on merkittävä poistettaviksi inputissa.");
    }
    const dbAineistot = dblp.lisaAineistot;
    const inputAineistot = inputVastine.lisaAineistot;
    validateTiedostoInput(dbAineistot, inputAineistot);
  });
}
