import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleVuorovaikutusKierrosAineistoChanged(projektiInDB: DBProjekti) {
  const currentAineistot = projektiInDB.vuorovaikutusKierros?.aineistot;
  if (!currentAineistot || !projektiInDB.vuorovaikutusKierros) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).vuorovaikutus(projektiInDB.vuorovaikutusKierros).aineisto;
  const uusiAineistot = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistot, paths });
  await projektiDatabase.saveSuunnitteluvaiheAineistot({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot,
  });
}
