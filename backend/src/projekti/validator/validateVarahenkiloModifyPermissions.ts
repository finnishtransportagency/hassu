import { DBProjekti } from "../../database/model";
import { KayttajaTyyppi, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { requireOmistaja } from "../../user/userService";

export function validateVarahenkiloModifyPermissions(projekti: DBProjekti, input: TallennaProjektiInput) {
  // Vain omistaja voi muokata projektiPaallikonVarahenkilo-kenttää poistamalla varahenkilöyden
  projekti.kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.VARAHENKILO && user.muokattavissa === true)
    .forEach((varahenkilo) => {
      // Vain omistaja voi muokata varahenkilöitä
      const varahenkiloInput = input.kayttoOikeudet?.filter((user) => user.kayttajatunnus == varahenkilo.kayttajatunnus).pop();
      if (varahenkiloInput) {
        if (varahenkiloInput.tyyppi !== varahenkilo.tyyppi) {
          requireOmistaja(projekti, "varahenkilön muokkaaminen");
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
            requireOmistaja(projekti, "varahenkilön lisääminen");
          }
        });
    });
}
