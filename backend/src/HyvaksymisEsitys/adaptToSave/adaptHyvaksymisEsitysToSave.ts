import * as API from "hassu-common/graphql/apiModel";
import { MuokattavaHyvaksymisEsitys } from "../../database/model";
import { adaptLadatutTiedostotToSave } from "./adaptLadatutTiedostotToSave";
import { adaptAineistotToSave } from "./adaptAineistotToSave";

/**
 * Antaa db:ssä olevan ja inputissa olevan tiedon perusteella hyväksymisesityksen muodon, joka halutaan tallentaa tietokantaan.
 *
 * @param dbHyvaksymisEsitys Hyväksymisesitys tietokannassa
 * @param hyvaksymisEsitysInput Käyttäjän lomakkeella antama hyväksymisesitys-input
 * @returns Hyväksymisesitys siinä muodossa kuin se halutaan tallentaa tietokantaan. Aineistot/tiedostot varustetaan lisätty-aikaleimalla.
 */
export function adaptHyvaksymisEsitysToSave(
  dbHyvaksymisEsitys: MuokattavaHyvaksymisEsitys | undefined | null,
  hyvaksymisEsitysInput: API.HyvaksymisEsitysInput
): MuokattavaHyvaksymisEsitys {
  const {
    hyvaksymisEsitys,
    suunnitelma,
    muistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    linkitetynProjektinAineisto,
    maanomistajaluettelo,
    vastaanottajat,
    kiireellinen,
    ...rest
  } = hyvaksymisEsitysInput;
  const newMuokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys = {
    kiireellinen,
    hyvaksymisEsitys: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.hyvaksymisEsitys, hyvaksymisEsitys),
    suunnitelma: adaptAineistotToSave(dbHyvaksymisEsitys?.suunnitelma, suunnitelma),
    muistutukset: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.muistutukset, muistutukset),
    lausunnot: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.lausunnot, lausunnot),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.kuulutuksetJaKutsu, kuulutuksetJaKutsu),
    muuAineistoVelhosta: adaptAineistotToSave(dbHyvaksymisEsitys?.muuAineistoVelhosta, muuAineistoVelhosta),
    muuAineistoKoneelta: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.muuAineistoKoneelta, muuAineistoKoneelta),
    linkitetynProjektinAineisto: adaptAineistotToSave(dbHyvaksymisEsitys?.linkitetynProjektinAineisto, linkitetynProjektinAineisto),
    maanomistajaluettelo: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.maanomistajaluettelo, maanomistajaluettelo),
    vastaanottajat: adaptVastaanottajatToSave(vastaanottajat),
    tila: API.HyvaksymisTila.MUOKKAUS,
    ...rest,
    versio: 1,
  };
  return newMuokattavaHyvaksymisEsitys;
}

export function adaptVastaanottajatToSave(vastaanottajat: API.SahkopostiVastaanottajaInput[] | null | undefined) {
  if (!vastaanottajat) {
    return vastaanottajat;
  }

  return vastaanottajat.map((vo) => ({ sahkoposti: vo.sahkoposti }));
}
