import { CopyObjectCommand, CopyObjectRequest } from "@aws-sdk/client-s3";
import { config } from "../../config";
import { log } from "../../logger";
import { getS3Client } from "../../aws/client";
import { adaptFileName, getYllapitoPathForProjekti, joinPath } from "../../tiedostot/paths";

/**
 * Kopioi ylläpitobucketissa olevan tiedoston annetusta sourceFile-polusta targetFile-polkuun
 *
 * @param sourceFile polku olemassaolevaan tiedostoon ylläpitobucketissa
 * @param targetFile polku luotavaan tiedostoon ylläpitobucketissa
 */
async function copyYllapitoFile(sourceFile: string, targetFile: string): Promise<void> {
  const yllapitoBucketName = config.yllapitoBucketName;
  if (sourceFile.includes(yllapitoBucketName) || targetFile.includes(yllapitoBucketName)) {
    throw new Error("Tiedostopoluissa ei saa olla ylläpito-buckettia mukana");
  }
  log.info(`Kopioidaan ${sourceFile} -> ${targetFile}`);

  const params: CopyObjectRequest = {
    Bucket: yllapitoBucketName,
    CopySource: joinPath(yllapitoBucketName, sourceFile),
    Key: targetFile,
    ChecksumAlgorithm: "CRC32",
  };
  log.info(`Kopioidaan ${params.CopySource} -> ${params.Key}`);
  try {
    await getS3Client().send(new CopyObjectCommand(params));
  } catch (e) {
    log.error("Yllapitotiedoston kopiointi epäonnistui:", (e as Error).message, "\nparams: ", params);
    console.log(sourceFile);
    throw new Error("Copy ylläpito files epäonnistui. " + (e as Error).message + " " + sourceFile);
  }
}

/**
 * Kopioi yhden vaiheen tiedostot toiselle vaiheelle
 *
 * @param oid Projektin oid
 * @param vaihePrefixFrom from-vaiheen kansio s3:ssa
 * @param vaihePrefixTo to-vaiheen kansio s3:ssa
 * @param files kopioitavat tiedostot; tiedossa nimi ja avain, jonka alla ne ovat vaiheessa
 */
export async function copyFilesFromVaiheToAnother(
  oid: string,
  vaihePrefixFrom: string,
  vaihePrefixTo: string,
  files: { nimi: string; avain: string }[]
) {
  const yllapito = getYllapitoPathForProjekti(oid);
  await Promise.all(
    files.map(({ avain, nimi }) =>
      copyYllapitoFile(
        joinPath(yllapito, vaihePrefixFrom, avain, adaptFileName(nimi)),
        joinPath(yllapito, vaihePrefixTo, avain, adaptFileName(nimi))
      )
    )
  );
}
