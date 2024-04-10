import * as API from "hassu-common/graphql/apiModel";
import { KunnallinenLadattuTiedosto, MuokattavaHyvaksymisEsitys } from "../database/model";
import { saveLadattuTiedostot } from "./adaptToSave/saveLadattuTiedostot";
import { saveAineistot } from "./adaptToSave/saveAineistot";

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
    maanomistajaluettelo,
    vastaanottajat,
    ...rest
  } = hyvaksymisEsitysInput;
  const newMuokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys = {
    hyvaksymisEsitys: saveLadattuTiedostot(dbHyvaksymisEsitys?.hyvaksymisEsitys, hyvaksymisEsitys),
    suunnitelma: saveAineistot(dbHyvaksymisEsitys?.suunnitelma, suunnitelma),
    muistutukset: saveLadattuTiedostot<KunnallinenLadattuTiedosto, API.KunnallinenLadattuTiedostoInput>(
      dbHyvaksymisEsitys?.muistutukset,
      muistutukset
    ),
    lausunnot: saveLadattuTiedostot(dbHyvaksymisEsitys?.lausunnot, lausunnot),
    kuulutuksetJaKutsu: saveLadattuTiedostot(dbHyvaksymisEsitys?.kuulutuksetJaKutsu, kuulutuksetJaKutsu),
    muuAineistoVelhosta: saveAineistot(dbHyvaksymisEsitys?.muuAineistoVelhosta, muuAineistoVelhosta),
    muuAineistoKoneelta: saveLadattuTiedostot(dbHyvaksymisEsitys?.muuAineistoKoneelta, muuAineistoKoneelta),
    maanomistajaluettelo: saveLadattuTiedostot(dbHyvaksymisEsitys?.maanomistajaluettelo, maanomistajaluettelo),
    vastaanottajat: adaptVastaanottajatToSave(vastaanottajat),
    ...rest,
  };
  return newMuokattavaHyvaksymisEsitys;
}

function adaptVastaanottajatToSave(vastaanottajat: string[] | null | undefined) {
  if (!vastaanottajat) {
    return vastaanottajat;
  }

  return vastaanottajat.map((vo) => ({ sahkoposti: vo }));
}
