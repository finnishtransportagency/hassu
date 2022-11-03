import { DBProjekti } from "../database/model";
import { KayttajaTyyppi, Projekti, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../user";
import { requireAdmin, requireOmistaja } from "../user/userService";
import { projektiAdapter } from "./adapter/projektiAdapter";
import assert from "assert";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { statusOrder } from "../../../common/statusOrder";

function validateKasittelynTila(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  if (input.kasittelynTila) {
    requireAdmin("Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja");

    assert(apiProjekti.status, "Projektilla ei ole statusta");
    const currentStatus = statusOrder[apiProjekti.status];

    if (input.kasittelynTila.hyvaksymispaatos) {
      if (currentStatus < statusOrder.NAHTAVILLAOLO) {
        throw new IllegalArgumentError(
          "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:" + apiProjekti.status
        );
      }
    }

    if (input.kasittelynTila.ensimmainenJatkopaatos) {
      if (
        !projekti.kasittelynTila?.hyvaksymispaatos ||
        (currentStatus !== statusOrder.EPAAKTIIVINEN_1 && currentStatus !== statusOrder.JATKOPAATOS_1)
      ) {
        throw new IllegalArgumentError(
          "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen. Projektilla pitää olla myös hyväksymispäätös. Projektin status nyt:" +
            apiProjekti.status
        );
      }
    }

    if (input.kasittelynTila.toinenJatkopaatos) {
      if (
        !projekti.kasittelynTila?.hyvaksymispaatos ||
        !projekti.kasittelynTila?.ensimmainenJatkopaatos ||
        (currentStatus !== statusOrder.EPAAKTIIVINEN_2 && currentStatus !== statusOrder.JATKOPAATOS_2)
      ) {
        throw new IllegalArgumentError(
          "Toista jatkopäätöstä voi muokata vain ensimmäisen jatkopäätöksen jälkeen. Projektilla pitää olla myös hyväksymispäätös ja ensimmäinen jatkopäätös. Projektin status nyt:" +
            apiProjekti.status
        );
      }
    }
  }
}

function validateVarahenkiloModifyPermissions(projekti: DBProjekti, input: TallennaProjektiInput) {
  // Vain omistaja voi muokata projektiPaallikonVarahenkilo-kenttää poistamalla varahenkilöyden
  projekti.kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.VARAHENKILO && user.muokattavissa === true)
    .forEach((varahenkilo) => {
      // Vain omistaja voi muokata varahenkilöitä
      const varahenkiloInput = input.kayttoOikeudet?.filter((user) => user.kayttajatunnus == varahenkilo.kayttajatunnus).pop();
      if (varahenkiloInput) {
        if (varahenkiloInput.tyyppi !== varahenkilo.tyyppi) {
          requireOmistaja(projekti);
        }
      }
    });

  input.kayttoOikeudet
    ?.filter((inputUser) => inputUser.tyyppi == KayttajaTyyppi.VARAHENKILO)
    .forEach((inputUser) => {
      // Vain omistaja voi muokata varahenkilöitä lisäämällä varahenkilöyden
      projekti.kayttoOikeudet
        ?.filter((kayttaja) => kayttaja.kayttajatunnus == inputUser.kayttajatunnus)
        .forEach((projektiKayttaja) => {
          if (projektiKayttaja.tyyppi !== inputUser.tyyppi) {
            requireOmistaja(projekti);
          }
        });
    });
}

export function validateTallennaProjekti(projekti: DBProjekti, input: TallennaProjektiInput): void {
  requirePermissionMuokkaa(projekti);
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);
  validateKasittelynTila(projekti, apiProjekti, input);
  validateVarahenkiloModifyPermissions(projekti, input);
}
