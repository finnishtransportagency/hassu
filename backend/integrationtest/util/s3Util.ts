import { produceAWSClient } from "../../src/aws/clientProducer";
import { S3Client } from "@aws-sdk/client-s3";

export function localstackS3Client() {
  produceAWSClient(
    "s3",
    () =>
      new S3Client({
        endpoint: "http://localhost:4566",
        forcePathStyle: true,
      }),
    true
  );
}
