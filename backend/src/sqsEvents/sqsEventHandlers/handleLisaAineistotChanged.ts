import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { assertIsDefined } from "../../util/assertions";
import { projektiDatabase } from "../projektiDatabase";
import handleLadatutTiedostot from "./common/handleLadatutTiedostot";

export async function handleLisaAineistotChanged(projektiInDB: DBProjekti, uuid: string) {
  const lausuntoPyynto = projektiInDB.lausuntoPyynnot?.find((lp) => lp.uuid == uuid);
  if (!lausuntoPyynto) {
    log.info(`Lausuntopyyntöä uuid:lla ${uuid} ei löydy`);
    return;
  }
  const currentLisaAineistot = lausuntoPyynto.lisaAineistot;
  if (!currentLisaAineistot) {
    return;
  }
  const indexOfLausuntoPyynto = projektiInDB.lausuntoPyynnot?.indexOf(lausuntoPyynto);
  assertIsDefined(indexOfLausuntoPyynto, "lausuntopyyntö on olemassa, joten sen indeksi on löydyttävä");
  const paths = new ProjektiPaths(projektiInDB.oid).lausuntoPyynto(lausuntoPyynto);
  const newLisaAineistot = await handleLadatutTiedostot({
    oid: projektiInDB.oid,
    tiedostot: currentLisaAineistot,
    targetFilePathInProjekti: paths.yllapitoFullPath,
  });
  await projektiDatabase.saveLausuntoPyyntoLisaAineistot({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newLisaAineistot,
    lausuntoPyyntoIndex: indexOfLausuntoPyynto,
  });
}
