import {
  EnnakkoNeuvottelu,
  EnnakkoNeuvotteluInput,
  EnnakkoNeuvotteluJulkaisu,
  NykyinenKayttaja,
  Status,
} from "hassu-common/graphql/apiModel";
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
import { createEnnakkoNeuvotteluHash } from "../HyvaksymisEsitys/latauslinkit/hash";

export function adaptEnnakkoNeuvotteluToSave(
  dbEnnakkoNeuvottelu: DBEnnakkoNeuvottelu | undefined | null,
  ennakkoNeuvotteluInput: EnnakkoNeuvotteluInput,
  nykyinenKayttaja: NykyinenKayttaja
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
    hyvaksymisEsitys,
    valitutKuulutuksetJaKutsu,
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
    muokkaaja: nykyinenKayttaja.uid,
    hyvaksymisEsitys: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.hyvaksymisEsitys, hyvaksymisEsitys),
    valitutKuulutuksetJaKutsu: adaptLadatutTiedostotToSave(dbEnnakkoNeuvottelu?.valitutKuulutuksetJaKutsu, valitutKuulutuksetJaKutsu),
    ...rest,
  };
  return ennakko;
}

export async function adaptEnnakkoNeuvotteluToAPI(
  dbProjekti: DBProjekti,
  status: Status | undefined
): Promise<EnnakkoNeuvottelu | undefined> {
  const { oid, ennakkoNeuvottelu } = dbProjekti;
  if (!ennakkoNeuvottelu) {
    return {
      __typename: "EnnakkoNeuvottelu",
      tuodutTiedostot: {
        __typename: "HyvaksymisEsityksenTuodutTiedostot",
        maanomistajaluettelo: await Promise.all(getMaanomistajaLuettelo(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
        kuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
        valitutKuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)), //tarviiko täällä
      },
      valitutKuulutuksetJaKutsu: [],
    };
  }
  const aineistotHandledAt = dbProjekti.aineistoHandledAt;
  const path = joinPath(getYllapitoPathForProjekti(oid), ENNAKKONEUVOTTELU_PATH);

  const kuulutuksetJaKutsu = ennakkoNeuvottelu.valitutKuulutuksetJaKutsu?.length
    ? adaptLadatutTiedostotToApi({
        tiedostot: ennakkoNeuvottelu.valitutKuulutuksetJaKutsu,
        path: joinPath(path, "valitutKuulutuksetJaKutsu"),
      })
    : adaptLadatutTiedostotToApi({
        tiedostot: ennakkoNeuvottelu.kuulutuksetJaKutsu,
        path: joinPath(path, "kuulutuksetJaKutsu"),
      });

  return {
    __typename: "EnnakkoNeuvottelu",
    poistumisPaiva: ennakkoNeuvottelu.poistumisPaiva ?? null,
    lisatiedot: ennakkoNeuvottelu.lisatiedot,
    hyvaksymisEsitys: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.hyvaksymisEsitys,
      path: joinPath(path, "hyvaksymisEsitys"),
    }),
    suunnitelma: adaptAineistotToAPI({ aineistot: ennakkoNeuvottelu.suunnitelma, aineistotHandledAt, path: joinPath(path, "suunnitelma") }),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.muistutukset,
      path: joinPath(path, "muistutukset"),
    }),
    lausunnot: adaptLadatutTiedostotToApi({ tiedostot: ennakkoNeuvottelu.lausunnot, path: joinPath(path, "lausunnot") }),
    kuulutuksetJaKutsu,
    valitutKuulutuksetJaKutsu: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvottelu.valitutKuulutuksetJaKutsu,
      path: joinPath(path, "valitutKuulutuksetJaKutsu"),
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
      maanomistajaluettelo: await Promise.all(getMaanomistajaLuettelo(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
      kuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
      valitutKuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)), //tarviiko täällä?
    },
  };
}

export async function adaptEnnakkoNeuvotteluJulkaisuToAPI(
  dbProjekti: DBProjekti,
  status: Status | undefined
): Promise<EnnakkoNeuvotteluJulkaisu | undefined> {
  const { oid, salt, ennakkoNeuvotteluJulkaisu } = dbProjekti;
  if (!ennakkoNeuvotteluJulkaisu) {
    return undefined;
  }
  const aineistotHandledAt = dbProjekti.aineistoHandledAt;
  const path = joinPath(getYllapitoPathForProjekti(oid), ENNAKKONEUVOTTELU_PATH);

  const kuulutuksetJaKutsu = ennakkoNeuvotteluJulkaisu.valitutKuulutuksetJaKutsu?.length
    ? adaptLadatutTiedostotToApi({
        tiedostot: ennakkoNeuvotteluJulkaisu.valitutKuulutuksetJaKutsu,
        path: joinPath(path, "valitutKuulutuksetJaKutsu"),
      })
    : adaptLadatutTiedostotToApi({
        tiedostot: ennakkoNeuvotteluJulkaisu.kuulutuksetJaKutsu,
        path: joinPath(path, "kuulutuksetJaKutsu"),
      });

  return {
    __typename: "EnnakkoNeuvotteluJulkaisu",
    poistumisPaiva: ennakkoNeuvotteluJulkaisu.poistumisPaiva ?? null,
    lisatiedot: ennakkoNeuvotteluJulkaisu.lisatiedot,
    hyvaksymisEsitys: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvotteluJulkaisu.hyvaksymisEsitys,
      path: joinPath(path, "hyvaksymisEsitys"),
    }),
    suunnitelma: adaptAineistotToAPI({
      aineistot: ennakkoNeuvotteluJulkaisu.suunnitelma,
      aineistotHandledAt,
      path: joinPath(path, "suunnitelma"),
    }),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvotteluJulkaisu.muistutukset,
      path: joinPath(path, "muistutukset"),
    }),
    lausunnot: adaptLadatutTiedostotToApi({ tiedostot: ennakkoNeuvotteluJulkaisu.lausunnot, path: joinPath(path, "lausunnot") }),
    kuulutuksetJaKutsu,
    valitutKuulutuksetJaKutsu: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvotteluJulkaisu.valitutKuulutuksetJaKutsu,
      path: joinPath(path, "valitutKuulutuksetJaKutsu"),
    }),
    muuAineistoVelhosta: adaptAineistotToAPI({
      aineistot: ennakkoNeuvotteluJulkaisu.muuAineistoVelhosta,
      aineistotHandledAt,
      path: joinPath(path, "muuAineistoVelhosta"),
    }),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvotteluJulkaisu.muuAineistoKoneelta,
      path: joinPath(path, "muuAineistoKoneelta"),
    }),
    maanomistajaluettelo: adaptLadatutTiedostotToApi({
      tiedostot: ennakkoNeuvotteluJulkaisu.maanomistajaluettelo,
      path: joinPath(path, "maanomistajaluettelo"),
    }),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(ennakkoNeuvotteluJulkaisu.vastaanottajat),
    tuodutTiedostot: {
      __typename: "HyvaksymisEsityksenTuodutTiedostot",
      maanomistajaluettelo: await Promise.all(getMaanomistajaLuettelo(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
      kuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
      valitutKuulutuksetJaKutsu: await Promise.all(getKutsut(dbProjekti, status).map(adaptFileInfoToLadattavaTiedosto)),
    },
    hash: createEnnakkoNeuvotteluHash(oid, salt),
    lahetetty: ennakkoNeuvotteluJulkaisu.lahetetty,
  };
}
