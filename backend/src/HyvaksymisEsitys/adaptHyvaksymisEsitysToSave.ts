import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projekti/adapter/projektiAdaptationResult";
import { DBProjekti, MuokattavaHyvaksymisEsitys } from "../database/model";
import { adaptAineistotToSave, adaptTiedostotToSave } from "../projekti/adapter/adaptToDB/common";
import { assertIsDefined } from "../util/assertions";

export function adaptHyvaksymisEsitysToSave(
  dbProjekti: DBProjekti,
  hyvaksymisEsitysInput: API.TallennaHyvaksymisEsitysInput
): ProjektiAdaptationResult {
  const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult(dbProjekti);
  const { oid, versio, muokattavaHyvaksymisEsitys } = hyvaksymisEsitysInput;
  const dbHyvaksymisEsitys = dbProjekti.muokattavaHyvaksymisEsitys;
  assertIsDefined(muokattavaHyvaksymisEsitys, "input on validoitu, ja muokattavaHyvaksymisEsitys on olemassa");
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
  } = muokattavaHyvaksymisEsitys;
  const newMuokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys = {
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
  const newProjekti = {
    oid,
    versio,
    muokattavaHyvaksymisEsitys: newMuokattavaHyvaksymisEsitys,
  };
  projektiAdaptationResult.setProjekti(newProjekti as DBProjekti);
  return projektiAdaptationResult;
}

function adaptVastaanottajatToSave(vastaanottajat: string[] | null | undefined) {
  if (!vastaanottajat) {
    return vastaanottajat;
  }

  return vastaanottajat.map((vo) => ({ sahkoposti: vo }));
}
