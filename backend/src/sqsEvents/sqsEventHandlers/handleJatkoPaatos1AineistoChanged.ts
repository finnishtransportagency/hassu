import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleJatkopaatos1AineistoChanged(projektiInDB: DBProjekti) {
  const currentAineistotNahtavilla = projektiInDB.jatkoPaatos1Vaihe?.aineistoNahtavilla;
  if (!currentAineistotNahtavilla) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).jatkoPaatos1Vaihe(projektiInDB.jatkoPaatos1Vaihe);
  const newAineistotNahtavilla = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistotNahtavilla, paths });
  await projektiDatabase.saveJatkoPaatos1VaiheAineistotNahtavilla({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newAineistotNahtavilla,
  });
}
