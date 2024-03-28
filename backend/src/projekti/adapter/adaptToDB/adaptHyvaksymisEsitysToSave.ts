import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { MuokattavaHyvaksymisEsitys } from "../../../database/model";
import { adaptAineistotToSave, adaptTiedostotToSave } from "./common";

export function adaptHyvaksymisEsitysToSave(
  dbHyvaksymisEsitys: MuokattavaHyvaksymisEsitys | undefined | null,
  hyvaksymisEsitysInput: API.HyvaksymisEsitysInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): MuokattavaHyvaksymisEsitys | null | undefined {
  if (!hyvaksymisEsitysInput) {
    return hyvaksymisEsitysInput;
  }
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
  const adapted: MuokattavaHyvaksymisEsitys = {
    hyvaksymisEsitys: adaptTiedostotToSave(dbHyvaksymisEsitys?.hyvaksymisEsitys, hyvaksymisEsitys, projektiAdaptationResult),
    suunnitelma: adaptAineistotToSave(dbHyvaksymisEsitys?.suunnitelma, suunnitelma, projektiAdaptationResult),
    muistutukset: adaptTiedostotToSave(dbHyvaksymisEsitys?.muistutukset, muistutukset, projektiAdaptationResult),
    lausunnot: adaptTiedostotToSave(dbHyvaksymisEsitys?.lausunnot, lausunnot, projektiAdaptationResult),
    kuulutuksetJaKutsu: adaptTiedostotToSave(dbHyvaksymisEsitys?.kuulutuksetJaKutsu, kuulutuksetJaKutsu, projektiAdaptationResult),
    muuAineistoVelhosta: adaptAineistotToSave(dbHyvaksymisEsitys?.muuAineistoVelhosta, muuAineistoVelhosta, projektiAdaptationResult),
    muuAineistoKoneelta: adaptTiedostotToSave(dbHyvaksymisEsitys?.muuAineistoKoneelta, muuAineistoKoneelta, projektiAdaptationResult),
    maanomistajaluettelo: adaptTiedostotToSave(dbHyvaksymisEsitys?.maanomistajaluettelo, maanomistajaluettelo, projektiAdaptationResult),
    vastaanottajat: adaptVastaanottajatToSave(vastaanottajat),
    ...rest,
  };
  return adapted;
}

function adaptVastaanottajatToSave(vastaanottajat: string[] | null | undefined) {
  if (!vastaanottajat) {
    return vastaanottajat;
  }

  return vastaanottajat.map((vo) => ({ sahkoposti: vo }));
}
