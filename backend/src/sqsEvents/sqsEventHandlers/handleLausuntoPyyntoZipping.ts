import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu } from "../../util/lausuntoPyyntoUtil";
import { TiedostoToZip, zipAineistot } from "./common/zipAineistot";

export async function handleLausuntoPyyntoZipping(projektiInDB: DBProjekti, uuid: string): Promise<void> {
  const lausuntoPyynto = projektiInDB.lausuntoPyynnot?.find((lp) => lp.uuid == uuid);
  if (!lausuntoPyynto) {
    log.info(`Lausuntopyyntöä uuid:lla ${uuid} ei löydy`);
    return;
  }
  if (lausuntoPyynto.poistetaan) {
    log.info(`Lausuntopyyntöä uuid:lla ${uuid} on merkitty poistettavaksi, joten ei luoda aineisto.zip:iä`);
    return;
  }

  const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projektiInDB);

  const lisaAineistot = lausuntoPyynto.lisaAineistot;
  const aineistotNahtavilla = nahtavillaolo?.aineistoNahtavilla;

  const projektiPath = new ProjektiPaths(projektiInDB.oid);
  const lausuntoPyyntoYllapitoFullPath = projektiPath.lausuntoPyynto(lausuntoPyynto).yllapitoFullPath;

  // Lisätään tiedostoihin tieto ylläpitoFullPath (ja zipFolder)
  const lisaAineistotToZip: TiedostoToZip[] | undefined = lisaAineistot?.map((tiedosto) => ({
    ...tiedosto,
    zipFolder: "Lisäaineistot",
  }));
  const aineistotNahtavillaToZip: TiedostoToZip[] | undefined = aineistotNahtavilla as TiedostoToZip[] | undefined;

  const aineistopakettiFullS3Key = lausuntoPyyntoYllapitoFullPath + "/aineisto.zip";
  const tiedostotToZip: TiedostoToZip[] = (lisaAineistotToZip ?? []).concat(aineistotNahtavillaToZip ?? []);
  await zipAineistot({ tiedostotToZip, zipFileS3Key: aineistopakettiFullS3Key, yllapitoFullPath: projektiPath.yllapitoFullPath });
}
