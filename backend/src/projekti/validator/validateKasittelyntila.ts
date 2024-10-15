import { DBProjekti, KasittelynTila } from "../../database/model";
import { KasittelyntilaInput, Projekti, Status, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { requireAdmin, requireOmistaja } from "../../user/userService";
import assert from "assert";
import { IllegalArgumentError } from "hassu-common/error";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { has, isEmpty, isEqual } from "lodash";

export function validateKasittelynTila(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput): void {
  if (input.kasittelynTila) {
    validateHasAccessToEditKasittelyntilaFields(projekti, input.kasittelynTila);
    assert(apiProjekti.status, "Projektilla ei ole statusta");

    validateKasittelyntilaHyvaksymispaatos(projekti, apiProjekti, input);
    validateKasittelyntilaEnsimmainenJatkopaatos(projekti, apiProjekti, input);
    validateKasittelyntilaToinenJatkopaatos(projekti, apiProjekti, input);
  }
}

const inputChangesKasittelynTilaField = (
  projekti: DBProjekti,
  input: TallennaProjektiInput,
  key: keyof KasittelyntilaInput & keyof KasittelynTila
) => has(input.kasittelynTila, key) && !isEqual(input.kasittelynTila?.[key], projekti.kasittelynTila?.[key]);

const inputChangesHyvaksymispaatosField = (projekti: DBProjekti, input: TallennaProjektiInput) => {
  if (
    (!projekti.kasittelynTila?.hyvaksymispaatos || isEqual(projekti.kasittelynTila.hyvaksymispaatos, {})) &&
    input.kasittelynTila?.hyvaksymispaatos?.asianumero === "" &&
    input.kasittelynTila.hyvaksymispaatos.paatoksenPvm === null
  ) {
    return false;
  }
  // ignore aktiivinen
  return (
    has(input.kasittelynTila, "hyvaksymispaatos") &&
    // @ts-expect-error ignore
    (!isEqual(input.kasittelynTila?.hyvaksymispaatos?.asianumero, projekti.kasittelynTila?.hyvaksymispaatos?.asianumero) ||
      // @ts-expect-error ignore
      !isEqual(input.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm, projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm))
  );
};

function validateHasAccessToEditKasittelyntilaFields(projekti: DBProjekti, input: KasittelyntilaInput): void {
  requireOmistaja(projekti, "Käsittelyn tilaa voi muokata vain projektipäällikkö");
  const { hyvaksymispaatos: _inputHyvaksymispaatos, ...inputAdminOikeudetVaativatKentat } = input;
  if (!isEmpty(inputAdminOikeudetVaativatKentat)) {
    requireAdmin("Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja");
  }
}

function validateKasittelyntilaHyvaksymispaatos(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  if (inputChangesHyvaksymispaatosField(projekti, input) && !isStatusGreaterOrEqualTo(apiProjekti.status, Status.NAHTAVILLAOLO)) {
    throw new IllegalArgumentError(
      "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:" + apiProjekti.status
    );
  }
}

function validateKasittelyntilaEnsimmainenJatkopaatos(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  if (inputChangesKasittelynTilaField(projekti, input, "ensimmainenJatkopaatos")) {
    if (!projekti.kasittelynTila?.hyvaksymispaatos) {
      throw new IllegalArgumentError("Ensimmäistä jatkopäätöstä voi muokata vasta kun projektilla on hyväksymispäätös");
    }
    if (!isStatusGreaterOrEqualTo(apiProjekti.status, Status.EPAAKTIIVINEN_1)) {
      throw new IllegalArgumentError(
        "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen. Projektin status nyt:" +
          apiProjekti.status
      );
    }
  }
}

function validateKasittelyntilaToinenJatkopaatos(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  if (inputChangesKasittelynTilaField(projekti, input, "toinenJatkopaatos")) {
    if (!projekti.kasittelynTila?.hyvaksymispaatos || !projekti.kasittelynTila?.ensimmainenJatkopaatos) {
      throw new IllegalArgumentError(
        "Toista jatkopäätöstä voi muokata vasta kun projektilla on hyväksymispäätös ja ensimmäinen jatkopäätös."
      );
    }
    if (!isStatusGreaterOrEqualTo(apiProjekti.status, Status.EPAAKTIIVINEN_2)) {
      throw new IllegalArgumentError(
        "Toista jatkopäätöstä voi muokata vasta toisen epäaktiivisuusjakson jälkeen. Projektin status nyt:" + apiProjekti.status
      );
    }
  }
}
