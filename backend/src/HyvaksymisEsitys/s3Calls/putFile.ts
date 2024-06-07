import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../aws/client";
import { adaptFileName } from "../../tiedostot/paths";
import * as mime from "mime-types";
import { log } from "../../logger";
import { config } from "../../config";

export default async function putFile({
  contents,
  filename,
  targetPath,
}: {
  contents: Buffer;
  filename: string;
  targetPath: string;
}): Promise<void> {
  try {
    const contentDisposition = "inline; filename*=UTF-8''" + encodeURIComponent(adaptFileName(filename));
    const contentType = mime.lookup(filename);
    await getS3Client().send(
      new PutObjectCommand({
        Body: contents,
        Bucket: config.yllapitoBucketName,
        Key: targetPath,
        ContentType: contentType || "application/octet-stream",
        ContentDisposition: contentDisposition,
      })
    );
    log.info(`Created file ${config.yllapitoBucketName}/${targetPath}`);
  } catch (e) {
    log.error(e);
    throw e;
  }
}
