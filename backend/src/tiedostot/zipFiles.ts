// Contains code generated or recommended by Amazon Q
import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { log } from "../logger";
import { PassThrough, Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import archiver from "archiver";
import { getS3Client } from "../aws/client";
import { config } from "../config";
import { joinPath } from "./paths";

// Max concurrent S3 GetObject requests during zip file generation.
// Node.js HTTP agent maxSockets=50 (configured by @smithy/node-http-handler).
// Using 25 leaves half the socket pool available for other concurrent operations
// (DynamoDB, SSM Parameter Store, SQS etc.) that the lambda performs during
// the same invocation. Using 50 would monopolize all sockets and cause
// "socket hang up" errors on other requests (observed in production 9.4.2025).
const MAX_CONCURRENT_S3_REQUESTS = 25;

function getFileName(s3Key: string, zipFolder?: string) {
  const fileName = s3Key.split("/").pop()!;
  if (!zipFolder) return fileName;
  return joinPath(zipFolder, fileName);
}

const s3Client = getS3Client();
async function getReadableStreamFromS3(bucket: string, s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  try {
    const response = await s3Client.send(command);
    return response.Body;
  } catch (e) {
    log.error("S3 tiedoston haku epäonnistui zippauksessa", { bucket, s3Key, error: e });
    if (!(e instanceof NoSuchKey)) {
      throw e;
    }
  }
}

function getWritableStreamFromS3(bucket: string, zipFileS3Key: string) {
  const passthrough = new PassThrough();
  const s3 = config.isInTest ? s3Client : new S3Client({ endpoint: "https://s3.eu-west-1.amazonaws.com", region: "eu-west-1" }); // for some unknown reason the upload needs s3client with endpoint, otherwise an error occurs "No valid endpoint provider available"
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: zipFileS3Key,
      Body: passthrough,
    },
  });
  upload.on("httpUploadProgress", (progress) => {
    log.info(progress);
  });
  const uploads = upload.done();
  return { passthrough, uploads };
}

async function fetchAndAppendToZip(zip: archiver.Archiver, bucket: string, zipSourceFile: ZipSourceFile): Promise<void> {
  const s3ReadableStream = await getReadableStreamFromS3(bucket, zipSourceFile.s3Key);
  if (s3ReadableStream) {
    zip.append(s3ReadableStream as Readable, { name: getFileName(zipSourceFile.s3Key, zipSourceFile.zipFolder) });
  }
}

async function fetchFilesWithConcurrencyLimit(zip: archiver.Archiver, bucket: string, zipSourceFiles: ZipSourceFile[]): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    while (index < zipSourceFiles.length) {
      const current = index++;
      await fetchAndAppendToZip(zip, bucket, zipSourceFiles[current]);
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_S3_REQUESTS, zipSourceFiles.length) }, () => next());
  await Promise.all(workers);
}

export type ZipSourceFile = { s3Key: string; zipFolder?: string };
export async function generateAndStreamZipfileToS3(bucket: string, zipSourceFiles: ZipSourceFile[], zipFileS3Key: string) {
  try {
    const { passthrough, uploads } = getWritableStreamFromS3(bucket, zipFileS3Key);
    await new Promise((resolve, reject) => {
      const zip = archiver("zip");

      passthrough.on("close", resolve);
      passthrough.on("end", resolve);
      passthrough.on("error", reject);

      zip.pipe(passthrough);
      fetchFilesWithConcurrencyLimit(zip, bucket, zipSourceFiles).then(() => zip.finalize());
    }).catch((error: { code: string; message: string; data: string }) => {
      throw new Error(`${error.code} ${error.message} ${error.data}`);
    });
    await uploads;
  } catch (error) {
    log.error(error);
  }
}
