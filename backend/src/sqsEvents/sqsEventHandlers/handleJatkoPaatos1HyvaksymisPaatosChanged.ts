import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleJatkopaatos1HyvaksymispaatosChanged(projektiInDB: DBProjekti) {
  const currentHyvaksymisPaatos = projektiInDB.jatkoPaatos1Vaihe?.hyvaksymisPaatos;
  if (!currentHyvaksymisPaatos) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).jatkoPaatos1Vaihe(projektiInDB.jatkoPaatos1Vaihe).paatos;
  const newHyvaksymisPaatos = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentHyvaksymisPaatos, paths });
  await projektiDatabase.saveHyvaksymisPaatosVaiheHyvaksymispaatos({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newHyvaksymisPaatos,
  });
}
