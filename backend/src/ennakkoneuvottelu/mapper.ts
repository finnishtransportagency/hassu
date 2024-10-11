import { EnnakkoNeuvottelu, EnnakkoNeuvotteluInput } from "hassu-common/graphql/apiModel";
import { DBEnnakkoNeuvottelu, DBProjekti } from "../database/model";
import { adaptAineistotToSave } from "../HyvaksymisEsitys/adaptToSave/adaptAineistotToSave";
import { adaptLadatutTiedostotToSave } from "../HyvaksymisEsitys/adaptToSave/adaptLadatutTiedostotToSave";
import { adaptVastaanottajatToSave } from "../HyvaksymisEsitys/adaptToSave/adaptHyvaksymisEsitysToSave";
import { ENNAKKONEUVOTTELU_PATH } from "./tallenna";
import { getYllapitoPathForProjekti, joinPath } from "../tiedostot/paths";
import { adaptAineistotToAPI } from "../HyvaksymisEsitys/adaptToApi/adaptAineistotToAPI";
import { adaptKunnallisetLadatutTiedostotToApi } from "../HyvaksymisEsitys/adaptToApi/adaptKunnallisetLadatutTiedostotToAPI";
import { adaptLadatutTiedostotToApi } from "../HyvaksymisEsitys/adaptToApi/adaptLadatutTiedostotToAPI";
import { adaptSahkopostiVastaanottajatToAPI } from "../HyvaksymisEsitys/adaptToApi/adaptSahkopostiVastaanottajatToAPI";
import { getKutsut, getMaanomistajaLuettelo } from "../HyvaksymisEsitys/collectHyvaksymisEsitysAineistot";
import { adaptFileInfoToLadattavaTiedosto } from "../HyvaksymisEsitys/latauslinkit/createLadattavatTiedostot";

export function adaptEnnakkoNeuvotteluToSave(
  dbEnnakkoNeuvottelu: DBEnnakkoNeuvottelu | undefined | null,
  ennakkoNeuvotteluInput: EnnakkoNeuvotteluInput,
  laheta: boolean
): DBEnnakkoNeuvottelu {
  const {
    suunnitelma,
    muistutukset,
    lausunnot,
    kuulutuksetJaKutsu,
    muuAineistoVelhosta,
    muuAineistoKoneelta,
    maanomistajaluettelo,
    vastaanottajat,
    ...rest
  } = ennakkoNeuvotteluInput;
  const ennakko: DBEnnakkoNeuvottelu = {
    suunnitelma: adaptAineistotToSave(dbEnnakkoNeuvottelu?.suunnitelma, suunnitelma),
    muistutukset: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.muistutukset, muistutukset),
    lausunnot: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.lausunnot, lausunnot),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.kuulutuksetJaKutsu, kuulutuksetJaKutsu),
    muuAineistoVelhosta: adaptAineistotToSave(dbEnnakkoNeuvottelu?.muuAineistoVelhosta, muuAineistoVelhosta),
    muuAineistoKoneelta: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.muuAineistoKoneelta, muuAineistoKoneelta),
    maanomistajaluettelo: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.maanomistajaluettelo, maanomistajaluettelo),
    vastaanottajat: adaptVastaanottajatToSave(vastaanottajat),
    lahetetty: laheta,
    ...rest,
  };
  return ennakko;
}

export async function adaptEnnakkoNeuvotteluToAPI(dbProjekti: DBProjekti): Promise<EnnakkoNeuvottelu | undefined> {
  const { oid, ennakkoNeuvottelu } = dbProjekti;
  if (!ennakkoNeuvottelu) {
    return undefined;
  }
  const aineistotHandledAt = dbProjekti.aineistoHandledAt;
  const path = joinPath(getYllapitoPathForProjekti(oid), ENNAKKONEUVOTTELU_PATH);
  return {
    __typename: "EnnakkoNeuvottelu",
    poistumisPaiva: ennakkoNeuvottelu.poistumisPaiva ?? null,
    lisatiedot: ennakkoNeuvottelu.lisatiedot,
    suunnitelma: adaptAineistotToAPI({ aineistot: ennakkoNeuvottelu.suunnitelma, aineistotHandledAt, path: joinPath(path, "suunnitelma") }),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.muistutukset,
      path: joinPath(path, "muistutukset"),
    }),
    lausunnot: adaptLadatutTiedostotToApi({ tiedostot: ennakkoNeuvottelu.lausunnot, path: joinPath(path, "lausunnot") }),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.kuulutuksetJaKutsu,
      path: joinPath(path, "kuulutuksetJaKutsu"),
    }),
    muuAineistoVelhosta: adaptAineistotToAPI({
      aineistot: ennakkoNeuvottelu.muuAineistoVelhosta,
      aineistotHandledAt,
      path: joinPath(path, "muuAineistoVelhosta"),
    }),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.muuAineistoKoneelta,
      path: joinPath(path, "muuAineistoKoneelta"),
    }),
    maanomistajaluettelo: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.maanomistajaluettelo,
      path: joinPath(path, "maanomistajaluettelo"),
    }),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(ennakkoNeuvottelu.vastaanottajat),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await Promise.all(getMaanomistajaLuettelo(dbProjekti).map(adaptFileInfoToLadattavaTiedosto)),
      kuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti).map(adaptFileInfoToLadattavaTiedosto)),
    },
  };
}
