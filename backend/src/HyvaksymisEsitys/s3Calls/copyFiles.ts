import { CopyObjectCommand, CopyObjectRequest } from "@aws-sdk/client-s3";
import { config } from "../../config";
import { log } from "../../logger";
import { getS3Client } from "../../aws/client";
import { getYllapitoPathForProjekti, joinPath } from "../paths";

/**
 * Kopioi tiedoston annetusta sourceFile-polusta targetFile-polkuun
 *
 * @param sourceFile polku tiedostoon; polun alussa ylläpitobucketin nimi
 * @param targetFile polku tiedostoon; polun alussa ylläpitobucketin nimi
 */
async function copyYllapitoFile(sourceFile: string, targetFile: string): Promise<void> {
  const yllapitoBucketName = config.yllapitoBucketName;
  if (!sourceFile.includes(yllapitoBucketName) || !targetFile.includes(yllapitoBucketName)) {
    throw new Error("Tiedostopolkujen pitää olla ylläpitobucketissa");
  }
  log.info(`Kopioidaan ${sourceFile} -> ${targetFile}`);
  const params: CopyObjectRequest = {
    Bucket: yllapitoBucketName,
    CopySource: encodeURIComponent(sourceFile),
    Key: encodeURIComponent(targetFile),
    ChecksumAlgorithm: "CRC32",
  };
  log.info(`Kopioidaan ${params.CopySource} -> ${params.Key}`);
  await getS3Client().send(new CopyObjectCommand(params));
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
      copyYllapitoFile(joinPath(yllapito, vaihePrefixFrom, avain, nimi), joinPath(yllapito, vaihePrefixTo, avain, nimi))
    )
  );
}
