import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleHyvaksymisVaiheAineistoChanged(projektiInDB: DBProjekti) {
  const currentAineistotNahtavilla = projektiInDB.hyvaksymisPaatosVaihe?.aineistoNahtavilla;
  if (!currentAineistotNahtavilla) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).hyvaksymisPaatosVaihe(projektiInDB.hyvaksymisPaatosVaihe);
  const newAineistotNahtavilla = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistotNahtavilla, paths });
  await projektiDatabase.saveHyvaksymisPaatosVaiheAineistotNahtavilla({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newAineistotNahtavilla,
  });
}
