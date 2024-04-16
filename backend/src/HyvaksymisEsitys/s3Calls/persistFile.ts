import { KunnallinenLadattuTiedosto, LadattuTiedostoNew } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import {
  S3_METADATA_ASIAKIRJATYYPPI,
  S3_METADATA_KIELI,
  getUploadedSourceFileInformation,
  removeBucketFromPath,
} from "../../files/fileService";
import { getYllapitoPathForProjekti } from "../paths";
import { getS3Client } from "../../aws/client";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../../config";
import { log } from "../../logger";
import { localDateTimeString } from "../../util/dateUtil";

export async function persistFile<A extends API.LadattuTiedostoInputNew | API.KunnallinenLadattuTiedostoInput>({
  oid,
  ladattuTiedosto,
  targetFilePathInProjekti,
  asiakirjaTyyppi,
  kieli,
}: {
  oid: string;
  ladattuTiedosto: A;
  targetFilePathInProjekti: string;
  asiakirjaTyyppi?: API.AsiakirjaTyyppi;
  kieli?: API.Kieli;
}): Promise<A extends API.LadattuTiedostoInputNew ? LadattuTiedostoNew : KunnallinenLadattuTiedosto> {
  const { tiedosto, uuid, jarjestys, ...kunta } = ladattuTiedosto as API.KunnallinenLadattuTiedostoInput;
  const sourceFileProperties = await getUploadedSourceFileInformation(tiedosto);
  const fileName = removeBucketFromPath(tiedosto);
  const targetPath = `/${targetFilePathInProjekti}/${fileName}`;
  const targetBucketPath = getYllapitoPathForProjekti(oid) + targetPath;
  try {
    const metadata: { [key: string]: string } = {};
    if (asiakirjaTyyppi) {
      metadata[S3_METADATA_ASIAKIRJATYYPPI] = asiakirjaTyyppi;
    }
    if (kieli) {
      metadata[S3_METADATA_KIELI] = kieli;
    }
    await getS3Client().send(
      new CopyObjectCommand({
        ...sourceFileProperties,
        Bucket: config.yllapitoBucketName,
        Key: targetBucketPath,
        MetadataDirective: "REPLACE",
        Metadata: metadata,
      })
    );
    log.info(`Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetBucketPath}`);
  } catch (e) {
    log.error(e);
    throw new Error("Error copying file to permanent storage");
  }

  assertIsDefined(fileName, "tiedostonimi pitäisi löytyä aina");
  const dbLadattuTiedosto = {
    uuid,
    jarjestys: jarjestys || undefined,
    lisatty: localDateTimeString(),
    ...kunta,
  };
  return dbLadattuTiedosto as A extends API.LadattuTiedostoInputNew ? LadattuTiedostoNew : KunnallinenLadattuTiedosto;
}
