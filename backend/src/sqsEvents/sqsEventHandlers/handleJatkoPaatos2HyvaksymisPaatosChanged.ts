import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleJatkopaatos2HyvaksymispaatosChanged(projektiInDB: DBProjekti) {
  const currentHyvaksymisPaatos = projektiInDB.jatkoPaatos2Vaihe?.hyvaksymisPaatos;
  if (!currentHyvaksymisPaatos) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).jatkoPaatos2Vaihe(projektiInDB.jatkoPaatos2Vaihe).paatos;
  const newHyvaksymisPaatos = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentHyvaksymisPaatos, paths });
  await projektiDatabase.saveHyvaksymisPaatosVaiheHyvaksymispaatos({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newHyvaksymisPaatos,
  });
}
