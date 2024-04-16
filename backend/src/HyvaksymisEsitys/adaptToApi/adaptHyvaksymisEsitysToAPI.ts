import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { adaptAineistotToAPI } from "./adaptAineistotToAPI";
import { adaptLadatutTiedostotToApi } from "./adaptLadatutTiedostotToAPI";
import { adaptLaskutustiedotToAPI } from "./adaptLaskutustiedotToAPI";
import { adaptKunnallisetLadatutTiedostotToApi } from "./adaptKunnallisetLadatutTiedostotToAPI";
import { adaptSahkopostiVastaanottajatToAPI } from "./adaptSahkopostiVastaanottajatToAPI";
import { createHyvaksymisEsitysHash } from "../lautaslinkit/hash";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH, getYllapitoPathForProjekti } from "../paths";

export function adaptHyvaksymisEsitysToAPI(
  projekti: Pick<DBProjekti, "oid" | "salt" | "muokattavaHyvaksymisEsitys" | "julkaistuHyvaksymisEsitys">
): API.HyvaksymisEsitys | undefined {
  const { oid, salt, muokattavaHyvaksymisEsitys, julkaistuHyvaksymisEsitys } = projekti;
  if (!(muokattavaHyvaksymisEsitys || julkaistuHyvaksymisEsitys)) {
    return undefined;
  }

  const hyvaksymisEsitys = muokattavaHyvaksymisEsitys ?? julkaistuHyvaksymisEsitys;
  const julkaistu = muokattavaHyvaksymisEsitys ? false : true;
  const aineistotHandledAt = julkaistu || muokattavaHyvaksymisEsitys?.aineistoHandledAt;

  assertIsDefined(hyvaksymisEsitys, "jomman kumman olemassaolo on varmistettu aiemmin");

  const path = getYllapitoPathForProjekti(projekti.oid) + (julkaistu ? JULKAISTU_HYVAKSYMISESITYS_PATH : MUOKATTAVA_HYVAKSYMISESITYS_PATH);

  return {
    __typename: "HyvaksymisEsitys",
    ...julkaistuHyvaksymisEsitys,
    ...muokattavaHyvaksymisEsitys, // Järjestys on tärkeä; muokattava ylikirjoittaa julkaistun
    poistumisPaiva: hyvaksymisEsitys.poistumisPaiva,
    laskutustiedot: adaptLaskutustiedotToAPI(hyvaksymisEsitys.laskutustiedot),
    hyvaksymisEsitys: adaptLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.hyvaksymisEsitys, path: path + "hyvaksymisEsitys/" }),
    suunnitelma: adaptAineistotToAPI({ aineistot: hyvaksymisEsitys.suunnitelma, aineistotHandledAt, path: path + "suunnitelma/" }),
    muistutukset: adaptKunnallisetLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.muistutukset, path: path + "muistutukset/" }),
    lausunnot: adaptLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.lausunnot, path: path + "lausunnot/" }),
    kuulutuksetJaKutsu: adaptLadatutTiedostotToApi({ tiedostot: hyvaksymisEsitys.kuulutuksetJaKutsu, path: path + "kuulutuksenJaKutsu/" }),
    muuAineistoVelhosta: adaptAineistotToAPI({
      aineistot: hyvaksymisEsitys.muuAineistoVelhosta,
      aineistotHandledAt,
      path: path + "muuAineistoVelhosta/",
    }),
    muuAineistoKoneelta: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.muuAineistoKoneelta,
      path: path + "muuAineistoKoneelta/",
    }),
    maanomistajaluettelo: adaptLadatutTiedostotToApi({
      tiedostot: hyvaksymisEsitys.maanomistajaluettelo,
      path: path + "maanomistajaluettelo/",
    }),
    vastaanottajat: adaptSahkopostiVastaanottajatToAPI(hyvaksymisEsitys.vastaanottajat),
    tila: muokattavaHyvaksymisEsitys ? muokattavaHyvaksymisEsitys.tila ?? API.HyvaksymisTila.MUOKKAUS : API.HyvaksymisTila.HYVAKSYTTY,
    hash: createHyvaksymisEsitysHash(oid, hyvaksymisEsitys.versio, salt),
  };
}
