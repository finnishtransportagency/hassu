import { IllegalArgumentError } from "hassu-common/error";
import { DBProjekti } from "../../database/model";
import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import * as API from "hassu-common/graphql/apiModel";
import { validateAineistoInput } from "./validateAineistoInput";
import { validateTiedostoInput } from "./validateTiedostoInput";

export function validateHyvaksymisEsitys(projekti: DBProjekti, input: TallennaProjektiInput) {
  const dbHyvaksymisEsitys = projekti.hyvaksymisEsitys;
  const inputHyvaksymisEsitys = input.hyvaksymisEsitys;
  if (dbHyvaksymisEsitys && dbHyvaksymisEsitys.tila !== API.HyvaksymisTila.MUOKKAUS && inputHyvaksymisEsitys == null) {
    throw new IllegalArgumentError("Hyväksymisesityksen tietoja ei saa tyhjentää, ellei se ole muokkaustilassa.");
  }

  if (inputHyvaksymisEsitys) {
    const keys = Object.keys(inputHyvaksymisEsitys);
    const allowedInputKeys = [
      "paattymisPaiva",
      "kiireellinen",
      "lisatiedot",
      "laskutustiedot",
      "hyvaksymisEsitys",
      "suunnitelma",
      "muistutukset",
      "lausunnot",
      "kuulutuksetJaKutsu",
      "muuAineistoVelhosta",
      "muuAineistoKoneelta",
      "maanomistajaluettelo",
      "vastaanottajat",
    ];
    const kiellettyAvain = keys.find((key) => !allowedInputKeys.includes(key));
    if (kiellettyAvain) {
      throw new IllegalArgumentError(`Hyväksymisesityksen inputissa on kielletty avain ${kiellettyAvain}`);
    }
    if (dbHyvaksymisEsitys) {
      validateAineistoInput(dbHyvaksymisEsitys.suunnitelma, inputHyvaksymisEsitys.suunnitelma);
      validateAineistoInput(dbHyvaksymisEsitys.muuAineistoVelhosta, inputHyvaksymisEsitys.muuAineistoVelhosta);
      validateTiedostoInput(dbHyvaksymisEsitys.muistutukset, inputHyvaksymisEsitys.muistutukset);
      validateTiedostoInput(dbHyvaksymisEsitys.lausunnot, inputHyvaksymisEsitys.lausunnot);
      validateTiedostoInput(dbHyvaksymisEsitys.hyvaksymisEsitys, inputHyvaksymisEsitys.hyvaksymisEsitys);
      validateTiedostoInput(dbHyvaksymisEsitys.muuAineistoKoneelta, inputHyvaksymisEsitys.muuAineistoKoneelta);
      validateTiedostoInput(dbHyvaksymisEsitys.kuulutuksetJaKutsu, inputHyvaksymisEsitys.kuulutuksetJaKutsu);
      validateTiedostoInput(dbHyvaksymisEsitys.maanomistajaluettelo, inputHyvaksymisEsitys.maanomistajaluettelo);
    }
  }
}
