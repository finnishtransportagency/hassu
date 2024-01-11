import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { assertIsDefined } from "../../util/assertions";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleVuorovaikutusKierrosJulkaisuAineistoChanged(projektiInDB: DBProjekti, id: number) {
  const vuorovaikutusKierrosJulkaisu = projektiInDB.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id == id);
  if (!vuorovaikutusKierrosJulkaisu) {
    log.info(`VuorovaikutusKierrosJulkaisua id:llä ${id} ei löydy`);
    return;
  }
  const currentAineistot = vuorovaikutusKierrosJulkaisu.aineistot;
  if (!currentAineistot) {
    return;
  }

  const indexOfJulkaisu = projektiInDB.vuorovaikutusKierrosJulkaisut?.indexOf(vuorovaikutusKierrosJulkaisu);
  assertIsDefined(indexOfJulkaisu, "vuorovaikutusKierrosJulkaisu on olemassa, joten sen indeksi on löydyttävä");
  const paths = new ProjektiPaths(projektiInDB.oid).vuorovaikutus(vuorovaikutusKierrosJulkaisu).aineisto;
  const uusiAineistot = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistot, paths });
  await projektiDatabase.saveVuorovaikutusKierrosJulkaisuAineistot({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot,
    vuorovaikutusKierrosIndex: indexOfJulkaisu,
  });
}
