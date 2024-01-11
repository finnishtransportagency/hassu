import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleJatkopaatos2AineistoChanged(projektiInDB: DBProjekti) {
  const currentAineistotNahtavilla = projektiInDB.jatkoPaatos2Vaihe?.aineistoNahtavilla;
  if (!currentAineistotNahtavilla) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).jatkoPaatos2Vaihe(projektiInDB.jatkoPaatos2Vaihe);
  const newAineistotNahtavilla = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistotNahtavilla, paths });
  await projektiDatabase.saveJatkoPaatos1VaiheAineistotNahtavilla({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newAineistotNahtavilla,
  });
}
