import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { adaptAineistotToAPI } from "./adaptAineistotToAPI";
import { adaptLadatutTiedostotToApi } from "./adaptLadatutTiedostotToAPI";
import { adaptLaskutustiedotToAPI } from "./adaptLaskutustiedotToAPI";
import { adaptKunnallisetLadatutTiedostotToApi } from "./adaptKunnallisetLadatutTiedostotToAPI";
import { adaptSahkopostiVastaanottajatToAPI } from "./adaptSahkopostiVastaanottajatToAPI";
import { createHyvaksymisEsitysHash } from "../latauslinkit/hash";
import {
  JULKAISTU_HYVAKSYMISESITYS_PATH,
  MUOKATTAVA_HYVAKSYMISESITYS_PATH,
  getYllapitoPathForProjekti,
  joinPath,
} from "../../tiedostot/paths";

/**
 * Riippuen siitä, onko hyväksymisesitys hyväksytty vai muussa tilassa, palauttaa tietoja muokattavasta tai julkaistusta hyväksymisesityksestä.
 *
 * @param projekti Projekti tietokannassa
 * @returns Tiedot hyväksymisesityksestä varustettuna aineistojen sijaintitiedolla ja tiedolla siitä, onko aineistot tuotu
 */
export function adaptHyvaksymisEsitysToAPI(
  projekti: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys">
): API.HyvaksymisEsitys | undefined {
  const { oid, salt, muokattavaHyvaksymisEsitys, julkaistuHyvaksymisEsitys } = projekti;
  if (!(muokattavaHyvaksymisEsitys || julkaistuHyvaksymisEsitys)) {
    return undefined;
  }

  const hyvaksymisEsitys =
    muokattavaHyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY ? julkaistuHyvaksymisEsitys : muokattavaHyvaksymisEsitys;
  const julkaistu = muokattavaHyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY;
  const aineistotHandledAt = julkaistu || muokattavaHyvaksymisEsitys?.aineistoHandledAt;

  assertIsDefined(hyvaksymisEsitys, "jomman kumman olemassaolo on varmistettu aiemmin");

  const path = joinPath(
    getYllapitoPathForProjekti(projekti.oid),
    julkaistu ? JULKAISTU_HYVAKSYMISESITYS_PATH : MUOKATTAVA_HYVAKSYMISESITYS_PATH
  );

  return {
    __typename: "HyvaksymisEsitys",
    hyvaksyja: julkaistuHyvaksymisEsitys?.hyvaksyja,
    hyvaksymisPaiva: julkaistuHyvaksymisEsitys?.hyvaksymisPaiva,
    poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
    laskutustiedot: adaptLaskutustiedotToAPI(hyvaksymisEsitys.laskutustiedot),
    hyvaksymisEsitys: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.hyvaksymisEsitys,
      path: joinPath(path, "hyvaksymisEsitys"),
    }),
    suunnitelma: adaptAineistotToAPI({ aineistot: hyvaksymisEsitys.suunnitelma, aineistotHandledAt, path: joinPath(path, "suunnitelma") }),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.muistutukset, path: joinPath(path, "muistutukset") }),
    lausunnot: adaptLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.lausunnot, path: joinPath(path, "lausunnot") }),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.kuulutuksetJaKutsu,
      path: joinPath(path, "kuulutuksenJaKutsu"),
    }),
    muuAineistoVelhosta: adaptAineistotToAPI({
      aineistot: hyvaksymisEsitys.muuAineistoVelhosta,
      aineistotHandledAt,
      path: joinPath(path, "muuAineistoVelhosta"),
    }),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.muuAineistoKoneelta,
      path: joinPath(path, "muuAineistoKoneelta"),
    }),
    maanomistajaluettelo: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.maanomistajaluettelo,
      path: joinPath(path, "maanomistajaluettelo"),
    }),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(hyvaksymisEsitys.vastaanottajat),
    tila: muokattavaHyvaksymisEsitys?.tila ?? API.HyvaksymisTila.MUOKKAUS,
    hash: createHyvaksymisEsitysHash(oid, hyvaksymisEsitys.versio, salt),
  };
}
