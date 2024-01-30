import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { log } from "../logger";
import { PassThrough, Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import archiver from "archiver";
import { getS3Client } from "../aws/client";
import { config } from "../config";

function getFileName(s3Key: string, zipFolder?: string) {
  const fileName = s3Key.split("/").pop()!;
  if (!zipFolder) return fileName;
  return zipFolder + fileName;
}

const s3Client = getS3Client();
async function getReadableStreamFromS3(bucket: string, s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  const response = await s3Client.send(command);
  return response.Body;
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

export type ZipSourceFile = { s3Key: string; zipFolder?: string };
type S3DownloadStreamDetails = { stream: Readable; filename: string };
export async function generateAndStreamZipfileToS3(bucket: string, zipSourceFiles: ZipSourceFile[], zipFileS3Key: string) {
  const readables: S3DownloadStreamDetails[] = [];
  try {
    for (const zipSourceFile of zipSourceFiles) {
      const s3ReadableStream = await getReadableStreamFromS3(bucket, zipSourceFile.s3Key);
      readables.push({ stream: s3ReadableStream as Readable, filename: getFileName(zipSourceFile.s3Key, zipSourceFile.zipFolder) });
    }

    const { passthrough, uploads } = getWritableStreamFromS3(bucket, zipFileS3Key);
    await new Promise((resolve, reject) => {
      const zip = archiver("zip");

      passthrough.on("close", resolve);
      passthrough.on("end", resolve);
      passthrough.on("error", reject);

      zip.pipe(passthrough);
      for (const file of readables) {
        zip.append(file.stream, { name: file.filename });
      }
      zip.finalize();
    }).catch((error: { code: string; message: string; data: string }) => {
      throw new Error(`${error.code} ${error.message} ${error.data}`);
    });
    await uploads;
  } catch (error) {
    log.error(error);
  }
}
