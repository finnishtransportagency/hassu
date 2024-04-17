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
 * @param param.ladattuTiedosto Persistoitava tiedosto, jonka tiedosto-kentässä on sen sijainti upload-kansiossa
 * @param param.kansioProjektinAlla Sijainti projektin alla, johon tiedosto halutaan tallentaa, esim. muokattava_hyvaksymisesitys/suunnitelma
 */
export async function persistFile({
  oid,
  ladattuTiedosto,
  kansioProjektinAlla,
}: {
  oid: string;
  ladattuTiedosto: { tiedosto: string; nimi: string };
  kansioProjektinAlla: string;
}): Promise<void> {
  const { tiedosto, nimi } = ladattuTiedosto;
  const sourceFileProperties = await getUploadedSourceFileInformation(tiedosto);
  const targetPath = joinPath(kansioProjektinAlla, nimi);
  const targetBucketPath = joinPath(getYllapitoPathForProjekti(oid), targetPath);
  try {
    await getS3Client().send(
      new CopyObjectCommand({
        ...sourceFileProperties,
        Bucket: config.yllapitoBucketName,
        Key: targetBucketPath,
        MetadataDirective: "REPLACE",
      })
    );
    log.info(`Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetBucketPath}`);
  } catch (e) {
    log.error(e);
    throw new Error("Error copying file to permanent storage");
  }
}
