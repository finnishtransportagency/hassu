import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../projektiDatabase";
import handleAineistot from "./common/handleAineistot";

export async function handleNahtavillaoloAineistoChanged(projektiInDB: DBProjekti) {
  const currentAineistotNahtavilla = projektiInDB.nahtavillaoloVaihe?.aineistoNahtavilla;
  if (!currentAineistotNahtavilla) {
    return;
  }
  const paths = new ProjektiPaths(projektiInDB.oid).nahtavillaoloVaihe(projektiInDB.nahtavillaoloVaihe);
  const newAineistotNahtavilla = await handleAineistot({ oid: projektiInDB.oid, aineistot: currentAineistotNahtavilla, paths });
  await projektiDatabase.saveNahtavillaoloAineistotNahtavilla({
    oid: projektiInDB.oid,
    projektiVersio: projektiInDB.versio,
    uusiAineistot: newAineistotNahtavilla,
  });
}
