import { DBProjekti, MuokattavaHyvaksymisEsitys, JulkaistuHyvaksymisEsitys } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiPaths } from "../../../files/ProjektiPath";
import {
  adaptAineistotToAPI,
  adaptKunnallisetLadatutTiedostotToApi,
  adaptLadatutTiedostotToApi,
  adaptLaskutustiedotToAPI,
  adaptSahkopostiVastaanottajatToAPI,
} from ".";
import { assertIsDefined } from "../../../util/assertions";

/*
Tuodaan fronttiin joko muokkaustilaisen tai julkaistun hyväksymisesityksen tiedot,
riippuen siitä, missä vaihessa hyväksymisesitys on.
Kentät, jotka on vain toisella näistä, tuodaan aina, jolloin
silloinkin kun hyväksymisesitys on avattu muokattavaksi,
saadaan fronttiin tieto siitä, milloin julkaistu esitys on julkaistu.
*/
export function adaptHyvaksymisEsitysToApi(
  projekti: DBProjekti,
  muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys | null | undefined,
  julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys | null | undefined
): API.HyvaksymisEsitys | undefined {
  if (!(muokattavaHyvaksymisEsitys || julkaistuHyvaksymisEsitys)) {
    return undefined;
  }

  const paths = muokattavaHyvaksymisEsitys
    ? new ProjektiPaths(projekti.oid).muokattavaHyvaksymisEsitys()
    : new ProjektiPaths(projekti.oid).julkaistuHyvaksymisEsitys();

  const hyvaksymisEsitys = muokattavaHyvaksymisEsitys ?? julkaistuHyvaksymisEsitys;
  assertIsDefined(hyvaksymisEsitys, "jomman kumman olemassaolo on varmistettu aiemmin");
  return {
    __typename: "HyvaksymisEsitys",
    ...julkaistuHyvaksymisEsitys,
    ...muokattavaHyvaksymisEsitys,
    poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
    laskutustiedot: adaptLaskutustiedotToAPI(hyvaksymisEsitys.laskutustiedot),
    hyvaksymisEsitys: adaptLadatutTiedostotToApi(hyvaksymisEsitys.hyvaksymisEsitys, paths),
    suunnitelma: adaptAineistotToAPI(hyvaksymisEsitys.suunnitelma, paths),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi(hyvaksymisEsitys.muistutukset, paths),
    lausunnot: adaptLadatutTiedostotToApi(hyvaksymisEsitys.lausunnot, paths),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToApi(hyvaksymisEsitys.kuulutuksetJaKutsu, paths),
    muuAineistoVelhosta: adaptAineistotToAPI(hyvaksymisEsitys.muuAineistoVelhosta, paths),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi(hyvaksymisEsitys.muuAineistoKoneelta, paths),
    maanomistajaluettelo: adaptLadatutTiedostotToApi(hyvaksymisEsitys.maanomistajaluettelo, paths),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(hyvaksymisEsitys.vastaanottajat),
    tila: muokattavaHyvaksymisEsitys ? muokattavaHyvaksymisEsitys.tila ?? API.HyvaksymisTila.MUOKKAUS : API.HyvaksymisTila.HYVAKSYTTY,
  };
}
