import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { zipAineistot } from "./common/zipAineistot";

export async function handleNahtavillaoloZipping(projektiInDB: DBProjekti): Promise<void> {
  const nahtavillaoloVaihe = projektiInDB.nahtavillaoloVaihe;
  if (!nahtavillaoloVaihe) {
    log.info(`Yritettiin zipata nähtävilläolon aineistoja, mutta ei löydetty nähtävilläolovaihetta`);
    return;
  }

  const aineistotNahtavilla = nahtavillaoloVaihe.aineistoNahtavilla;
  const projektiPath = new ProjektiPaths(projektiInDB.oid);
  const nahtavillaoloVaiheYllapitoFullPath = projektiPath.nahtavillaoloVaihe(nahtavillaoloVaihe).yllapitoFullPath;

  // Lisätään tiedostoihin tieto ylläpitoFullPath
  if (aineistotNahtavilla) {
    const aineistopakettiFullS3Key = nahtavillaoloVaiheYllapitoFullPath + "/aineisto.zip";
    await zipAineistot({
      tiedostotToZip: aineistotNahtavilla,
      zipFileS3Key: aineistopakettiFullS3Key,
      yllapitoFullPath: projektiPath.yllapitoFullPath,
    });
  }
}
