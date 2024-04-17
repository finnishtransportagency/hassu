import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../aws/client";
import { config } from "../../config";
import { log } from "../../logger";
import { getYllapitoPathForProjekti } from "../paths";

/**
 * Poistaa tiedostoja annetun projektin julkaistulta hyväksymisesitykseltä
 *
 * @param oid Projektin oid
 * @param pathToVaihe polku ylläpito-bucketissa vaiheen tiedostoihin, esim. muokattava_hyvaksymisesitys/
 * @param tiedostot Lista tiedostoja, joilla on nimi (tiedoston nimi) ja avain (kansion nimi)
 * @param reason Syy poistolle
 */
export async function deleteFilesUnderSpecifiedVaihe(
  oid: string,
  pathToVaihe: string,
  tiedostot: { nimi: string; avain: string }[],
  reason?: string
) {
  if (tiedostot.some((tiedosto) => tiedosto.avain.match(/\//) || tiedosto.nimi.match(/\//))) {
    throw new Error("Tiedoston avain tai nimi ei saa sisältää kauttaviivoja");
  }
  // TODO: varmista että pathToVaiheessa joko on tai ei ole kauttaviivaa
  return deleteProjektiFilesFromYllapito(
    oid,
    tiedostot.map((tiedosto) => pathToVaihe + tiedosto.avain + "/" + tiedosto.nimi),
    reason
  );
}

/**
 * Poistaa tiedostoja annetun projektin S3-ylläpito-bucketista
 *
 * @param oid Projektin oid
 * @param paths Lista tiedostopolkuja projektikohtaisen ylläpito-bucketin alla. Polun alussa ei kauttaviivaa.
 * @param reason Syy poistolle
 */
async function deleteProjektiFilesFromYllapito(oid: string, paths: string[], reason?: string) {
  if (paths.some((path) => path.match(/^\//))) {
    throw new Error("Polun alussa ei saa olla kauttaviivaa");
  }
  return deleteFilesFromYllapito(
    paths.map((path) => getYllapitoPathForProjekti(oid) + path),
    reason
  );
}

/**
 * Poistaa tiedostoja ylläpito-bucketista
 *
 * @param paths Lista tiedostopolkuja yllpito-bucketin alla
 * @param reason Syy poistolle
 */
async function deleteFilesFromYllapito(paths: string[], reason?: string) {
  // TODO: jaa 1000 paloihin, koska avaimia saa olla max 1000
  await getS3Client().send(
    new DeleteObjectsCommand({
      Bucket: config.yllapitoBucketName,
      Delete: { Objects: paths.map((path) => ({ Key: path })) },
    })
  );
  log.info(`Deleted ylläpito files ${paths.join(", ")}.${reason ? ` Reason: ${reason}` : ""}`);
}
