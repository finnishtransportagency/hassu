import { DBProjekti, HyvaksymisEsitys } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiPaths } from "../../../files/ProjektiPath";
import { adaptAineistotToAPI, adaptLadatutTiedostotToApi, adaptLaskutustiedotToAPI, adaptSahkopostiVastaanottajatToAPI } from ".";

export function adaptHyvaksymisEsitysToAPI(
  dbProjekti: DBProjekti,
  hyvaksymisEsitys?: HyvaksymisEsitys | null
): API.HyvaksymisEsitys | undefined {
  if (!hyvaksymisEsitys) {
    return undefined;
  }
  const paths = new ProjektiPaths(dbProjekti.oid).hyvaksymisEsitys();

  return {
    __typename: "HyvaksymisEsitys",
    ...hyvaksymisEsitys,
    laskutustiedot: adaptLaskutustiedotToAPI(hyvaksymisEsitys.laskutustiedot),
    hyvaksymisEsitys: adaptLadatutTiedostotToApi(hyvaksymisEsitys.hyvaksymisEsitys, paths),
    suunnitelma: adaptAineistotToAPI(hyvaksymisEsitys.suunnitelma, paths),
    muistutukset: adaptLadatutTiedostotToApi(hyvaksymisEsitys.muistutukset, paths),
    lausunnot: adaptLadatutTiedostotToApi(hyvaksymisEsitys.lausunnot, paths),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToApi(hyvaksymisEsitys.kuulutuksetJaKutsu, paths),
    muuAineistoVelhosta: adaptAineistotToAPI(hyvaksymisEsitys.muuAineistoVelhosta, paths),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi(hyvaksymisEsitys.muuAineistoKoneelta, paths),
    maanomistajaluettelo: adaptLadatutTiedostotToApi(hyvaksymisEsitys.maanomistajaluettelo, paths),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(hyvaksymisEsitys.vastaanottajat),
    tila: hyvaksymisEsitys.tila ?? API.HyvaksymisTila.MUOKKAUS,
  };
}
