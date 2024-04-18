import { getUploadedSourceFileInformation } from "../../files/fileService";
import { getYllapitoPathForProjekti, joinPath } from "../paths";
import { getS3Client } from "../../aws/client";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../../config";
import { log } from "../../logger";

/**
 * Persistoi yksittäisen tiedoston, joka on tallennettu uploads-kansioon, annettuun uuteen sijaintiin ylläpito-bucketissa
 *
 * @param param
 * @param param.oid Projektin oid
 * @param param.ladattuTiedosto Persistoitavan tiedoston tiedot
 * @param param.ladattuTiedosto.tiedosto Persistoitavan tiedoston sijainti upload-kansiossa, esim. uploads/876-235-235/tiedosto.jpg
 * @param param.ladattuTiedosto.nimi Persistoitavan tiedoston nimi
 * @param param.ladattuTiedosto.avain Sijainti projektin vaiheen alla, johon tiedosto halutaan tallentaa, esim. muuAineistoKoneelta
 * @param param.vaihePrefix Prefix sille vaiheelle, jonka alle tiedosto persistoidaan, esim. muokattava_hyvaksymisesitys
 */
export async function persistFile({
  oid,
  ladattuTiedosto,
  vaihePrefix,
}: {
  oid: string;
  ladattuTiedosto: { tiedosto: string; nimi: string; avain: string };
  vaihePrefix: string;
}): Promise<void> {
  const { tiedosto, nimi, avain } = ladattuTiedosto;
  const sourceFileProperties = await getUploadedSourceFileInformation(tiedosto);
  const targetPath = joinPath(getYllapitoPathForProjekti(oid), vaihePrefix, avain, nimi);
  try {
    await getS3Client().send(
      new CopyObjectCommand({
        ...sourceFileProperties,
        Bucket: config.yllapitoBucketName,
        Key: targetPath,
        MetadataDirective: "REPLACE",
      })
    );
    log.info(`Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetPath}`);
  } catch (e) {
    log.error(e);
    throw new Error("Error copying file to permanent storage");
  }
}
