import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../aws/client";
import { config } from "../../config";
import { log } from "../../logger";
import { adaptFileName, getYllapitoPathForProjekti, joinPath } from "../../tiedostot/paths";

/**
 * Poistaa tiedostoja annetun projektin julkaistulta hyväksymisesitykseltä
 *
 * @param oid Projektin oid
 * @param pathToVaihe polku ylläpito-bucketissa vaiheen tiedostoihin, esim. muokattava_hyvaksymisesitys
 * @param tiedostot Lista tiedostoja, joilla on nimi (tiedoston nimi) ja avain (kansion nimi)
 * @param reason Syy poistolle
 */
export async function deleteFilesUnderSpecifiedVaihe(
  oid: string,
  pathToVaihe: string,
  tiedostot: { nimi: string; avain: string }[],
  reason?: string
) {
  return deleteProjektiFilesFromYllapito(
    oid,
    tiedostot.map((tiedosto) => joinPath(pathToVaihe, tiedosto.avain, adaptFileName(tiedosto.nimi))),
    reason
  );
}

/**
 * Poistaa tiedostoja annetun projektin S3-ylläpito-bucketista
 *
 * @param oid Projektin oid
 * @param paths Lista tiedostopolkuja projektikohtaisen ylläpito-bucketin alla
 * @param reason Syy poistolle
 */
async function deleteProjektiFilesFromYllapito(oid: string, paths: string[], reason?: string) {
  return deleteFilesFromYllapito(
    paths.map((path) => joinPath(getYllapitoPathForProjekti(oid), path)),
    reason
  );
}

/**
 * Poistaa tiedostoja ylläpito-bucketista
 *
 * @param paths Lista tiedostopolkuja ylläpito-bucketin alla
 * @param reason Syy poistolle
 */
async function deleteFilesFromYllapito(paths: string[], reason?: string) {
  await Promise.all(
    // DeleteObjectsCommand takes at most 1000 items
    getChunksOfThousand(paths).map((paths) =>
      getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: config.yllapitoBucketName,
          Delete: { Objects: paths.map((path) => ({ Key: path })) },
        })
      )
    )
  );
  log.info(`Deleted ylläpito files ${paths.join(", ")}.${reason ? ` Reason: ${reason}` : ""}`);
}

function getChunksOfThousand<T>(array: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += 1000) {
    chunks.push(array.slice(i, i + 1000));
  }
  return chunks;
}
