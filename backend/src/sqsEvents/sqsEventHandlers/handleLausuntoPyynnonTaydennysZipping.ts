import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { log } from "../../logger";
import { TiedostoToZip, zipAineistot } from "./common/zipAineistot";

export async function handleLausuntoPyynnonTaydennysZipping(projektiInDB: DBProjekti, uuid: string): Promise<void> {
  const lausuntoPyynnonTaydennys = projektiInDB.lausuntoPyynnonTaydennykset?.find((lp) => lp.uuid == uuid);
  if (!lausuntoPyynnonTaydennys) {
    log.info(`Lausuntopyynnön täydennystä uuid:lla ${uuid} ei löydy`);
    return;
  }
  if (lausuntoPyynnonTaydennys.poistetaan) {
    log.info(`Lausuntopyynnön täydennys uuid:lla ${uuid} on merkitty poistettavaksi, joten ei luoda aineisto.zip:iä`);
    return;
  }

  const muuAineisto = lausuntoPyynnonTaydennys.muuAineisto;
  const muistutukset = lausuntoPyynnonTaydennys.muistutukset;

  const projektiPath = new ProjektiPaths(projektiInDB.oid);
  const lausuntoPyynnonTaydennysYllapitoFullPath = projektiPath.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys).yllapitoFullPath;

  // Lisätään tiedostoihin tieto ylläpitoFullPath (ja zipFolder)
  const muuAineistoToZip: TiedostoToZip[] | undefined = muuAineisto?.map((tiedosto) => ({
    ...tiedosto,
    zipFolder: "Muu aineisto",
  }));
  const muistutuksetToZip: TiedostoToZip[] | undefined = muistutukset?.map((aineisto) => ({
    ...aineisto,
    zipFolder: "Muistutukset",
  }));

  const aineistopakettiFullS3Key = lausuntoPyynnonTaydennysYllapitoFullPath + "/aineisto.zip";
  const tiedostotToZip: TiedostoToZip[] = (muuAineistoToZip ?? []).concat(muistutuksetToZip ?? []);

  await zipAineistot({ tiedostotToZip, zipFileS3Key: aineistopakettiFullS3Key, yllapitoFullPath: projektiPath.yllapitoFullPath });
}
