import { S3Client } from "@aws-sdk/client-s3";

/* This function is separated into an individual module so that it can be replaced in integration and unit tests */
let client: S3Client;

function getS3Client() {
  if (!client) {
    client = new S3Client({});
  }
  return client;
}

export const s3Client = { get: () => getS3Client() };
