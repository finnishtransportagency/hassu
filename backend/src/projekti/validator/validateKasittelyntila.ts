import { DBProjekti, KasittelynTila } from "../../database/model";
import { KasittelyntilaInput, Projekti, Status, TallennaProjektiInput } from "../../../../common/graphql/apiModel";
import { requireAdmin, requireOmistaja } from "../../user/userService";
import assert from "assert";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { isProjektiStatusGreaterOrEqualTo } from "../../../../common/statusOrder";
import { has, isEmpty, isEqual } from "lodash";

type InputChangesKasittelynTilaFieldFunc = (key: keyof KasittelyntilaInput & keyof KasittelynTila) => boolean;

export function validateKasittelynTila(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput): void {
  if (input.kasittelynTila) {
    validateHasAccessToEditKasittelyntilaFields(projekti, input.kasittelynTila);
    assert(apiProjekti.status, "Projektilla ei ole statusta");

    const inputChangesKasittelynTilaField: InputChangesKasittelynTilaFieldFunc = (key) =>
      has(input.kasittelynTila, key) && !isEqual(input.kasittelynTila?.[key], projekti.kasittelynTila?.[key]);

    validateKasittelyntilaHyvaksymispaatos(apiProjekti, inputChangesKasittelynTilaField);
    validateKasittelyntilaEnsimmainenJatkopaatos(apiProjekti, projekti, inputChangesKasittelynTilaField);
    validateKasittelyntilaToinenJatkopaatos(apiProjekti, projekti, inputChangesKasittelynTilaField);
  }
}

function validateHasAccessToEditKasittelyntilaFields(projekti: DBProjekti, input: KasittelyntilaInput) {
  requireOmistaja(projekti, "Hyväksymispäätöksen muokkaaminen on mahdollista vain projektipäällikölle");
  const { hyvaksymispaatos: _inputHyvaksymispaatos, ...inputAdminOikeudetVaativatKentat } = input;
  if (!isEmpty(inputAdminOikeudetVaativatKentat)) {
    requireAdmin("Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja");
  }
}

function validateKasittelyntilaHyvaksymispaatos(
  apiProjekti: Projekti,
  inputChangesKasittelynTilaField: InputChangesKasittelynTilaFieldFunc
) {
  if (inputChangesKasittelynTilaField("hyvaksymispaatos") && !isProjektiStatusGreaterOrEqualTo(apiProjekti, Status.NAHTAVILLAOLO)) {
    throw new IllegalArgumentError(
      "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:" + apiProjekti.status
    );
  }
}

function validateKasittelyntilaEnsimmainenJatkopaatos(
  apiProjekti: Projekti,
  projekti: DBProjekti,
  inputChangesKasittelynTilaField: InputChangesKasittelynTilaFieldFunc
) {
  if (inputChangesKasittelynTilaField("ensimmainenJatkopaatos")) {
    if (!projekti.kasittelynTila?.hyvaksymispaatos) {
      throw new IllegalArgumentError("Ensimmäistä jatkopäätöstä voi muokata vasta kun projektilla on hyväksymispäätös");
    }
    if (!isProjektiStatusGreaterOrEqualTo(apiProjekti, Status.EPAAKTIIVINEN_1)) {
      throw new IllegalArgumentError(
        "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen. Projektin status nyt:" +
          apiProjekti.status
      );
    }
  }
}

function validateKasittelyntilaToinenJatkopaatos(
  apiProjekti: Projekti,
  projekti: DBProjekti,
  inputChangesKasittelynTilaField: InputChangesKasittelynTilaFieldFunc
) {
  if (inputChangesKasittelynTilaField("toinenJatkopaatos")) {
    if (!projekti.kasittelynTila?.hyvaksymispaatos || !projekti.kasittelynTila?.ensimmainenJatkopaatos) {
      throw new IllegalArgumentError(
        "Toista jatkopäätöstä voi muokata vasta kun projektilla on hyväksymispäätös ja ensimmäinen jatkopäätös."
      );
    }
    if (!isProjektiStatusGreaterOrEqualTo(apiProjekti, Status.EPAAKTIIVINEN_2)) {
      throw new IllegalArgumentError(
        "Toista jatkopäätöstä voi muokata vasta toisen epäaktiivisuusjakson jälkeen. Projektin status nyt:" + apiProjekti.status
      );
    }
  }
}
