import { GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../../config";
import { getS3Client } from "../../aws/client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getYllapitoSignedDownloadLink(tiedosto: string): Promise<string> {
  const s3client = getS3Client();
  const getObjectCommand = new GetObjectCommand({
    Bucket: config.yllapitoBucketName,
    Key: tiedosto,
  });
  return getSignedUrl(s3client, getObjectCommand, {
    expiresIn: 60 * 60, // One hour
  });
}
