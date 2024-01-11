import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { assertIsDefined } from "../../util/assertions";
import { projektiDatabase } from "../projektiDatabase";
import handleLadatutTiedostot from "./common/handleLadatutTiedostot";

export async function handleMuitutuksetChanged(projektiInDB: DBProjekti, uuid: string) {
  const lausuntoPyynnonTaydennys = projektiInDB.lausuntoPyynnonTaydennykset?.find((lp) => lp.uuid == uuid);
  if (!lausuntoPyynnonTaydennys) {
    log.info(`Lausuntopyynnon täydennystä uuid:lla ${uuid} ei löydy`);
    return;
  }
  const currentMuistutukset = lausuntoPyynnonTaydennys.muistutukset;
  if (!currentMuistutukset) {
    return;
  }
  const indexOfLausuntoPyynnonTaydennys = projektiInDB.lausuntoPyynnonTaydennykset?.indexOf(lausuntoPyynnonTaydennys);
  assertIsDefined(indexOfLausuntoPyynnonTaydennys, "lausuntopyynnön täydennys on olemassa, joten sen indeksi on löydyttävä");
  const paths = new ProjektiPaths(projektiInDB.oid).lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys);
  const newMuistutukset = await handleLadatutTiedostot({
    oid: projektiInDB.oid,
    tiedostot: currentMuistutukset,
    targetFilePathInProjekti: paths.yllapitoFullPath,
  });
  await projektiDatabase.saveLausuntoPyynnonTaydennysMuistutukset({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newMuistutukset,
    lausuntoPyynnonTaydennysIndex: indexOfLausuntoPyynnonTaydennys,
  });
}
