import * as API from "hassu-common/graphql/apiModel";
import { KunnallinenLadattuTiedosto, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { adaptLadatutTiedostotToSave } from "./adaptLadatutTiedostotToSave";
import { adaptAineistotToSave } from "./adaptAineistotToSave";

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
    hyvaksymisEsitys: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.hyvaksymisEsitys, hyvaksymisEsitys),
    suunnitelma: adaptAineistotToSave(dbHyvaksymisEsitys?.suunnitelma, suunnitelma),
    muistutukset: adaptLadatutTiedostotToSave<KunnallinenLadattuTiedosto, API.KunnallinenLadattuTiedostoInput>(
      dbHyvaksymisEsitys?.muistutukset,
      muistutukset
    ),
    lausunnot: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.lausunnot, lausunnot),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.kuulutuksetJaKutsu, kuulutuksetJaKutsu),
    muuAineistoVelhosta: adaptAineistotToSave(dbHyvaksymisEsitys?.muuAineistoVelhosta, muuAineistoVelhosta),
    muuAineistoKoneelta: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.muuAineistoKoneelta, muuAineistoKoneelta),
    maanomistajaluettelo: adaptLadatutTiedostotToSave(dbHyvaksymisEsitys?.maanomistajaluettelo, maanomistajaluettelo),
    vastaanottajat: adaptVastaanottajatToSave(vastaanottajat),
    ...rest,
    versio: 1,
  };
  return newMuokattavaHyvaksymisEsitys;
}

function adaptVastaanottajatToSave(vastaanottajat: string[] | null | undefined) {
  if (!vastaanottajat) {
    return vastaanottajat;
  }

  return vastaanottajat.map((vo) => ({ sahkoposti: vo }));
}
