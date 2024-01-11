import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleHyvaksymisVaiheHyvaksymisPaatosChanged(projektiInDB: DBProjekti) {
  const currentHyvaksymisPaatos = projektiInDB.hyvaksymisPaatosVaihe?.hyvaksymisPaatos;
  if (!currentHyvaksymisPaatos) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).hyvaksymisPaatosVaihe(projektiInDB.hyvaksymisPaatosVaihe).paatos;
  const newHyvaksymisPaatos = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentHyvaksymisPaatos, paths });
  await projektiDatabase.saveHyvaksymisPaatosVaiheHyvaksymispaatos({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newHyvaksymisPaatos,
  });
}
