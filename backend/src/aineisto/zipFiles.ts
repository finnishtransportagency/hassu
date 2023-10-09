import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { log } from "../logger";
import { PassThrough, Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import archiver from "archiver";
import { getS3Client } from "../aws/client";

function getFileName(s3Key: string, zipFolder?: string) {
  const fileName = s3Key.split("/").pop()!;
  if (!zipFolder) return fileName;
  return zipFolder + fileName;
}

const s3Client = getS3Client();
async function getReadableStreamFromS3(bucket: string, s3Key: string) {
  log.info("get object command");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  log.info("send command");
  log.info("read client endpoint: " + s3Client.config);
  const response = await s3Client.send(command);
  log.info("response: " + response.Body);
  log.info("length: " + response.ContentLength);
  return response.Body;
}

function getWritableStreamFromS3(bucket: string, zipFileS3Key: string) {
  const passthrough = new PassThrough();
  const s3 = new S3Client({ endpoint: "https://s3.eu-west-1.amazonaws.com", region: "eu-west-1" }); // for some unknown reason the upload needs s3client with endpoint, otherwise an error occurs "No valid endpoint provider available"
  log.info("s3 endpoint" + s3.config);
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: zipFileS3Key,
      Body: passthrough,
    },
  });
  upload.on("httpUploadProgress", (progress) => {
    console.log(progress);
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
      log.info("reading " + zipSourceFile.s3Key);
      const s3ReadableStream = await getReadableStreamFromS3(bucket, zipSourceFile.s3Key);
      readables.push({ stream: s3ReadableStream as Readable, filename: getFileName(zipSourceFile.s3Key, zipSourceFile.zipFolder) });
    }

    const { passthrough, uploads } = getWritableStreamFromS3(bucket, zipFileS3Key);
    await new Promise((resolve, reject) => {
      const zip = archiver("zip");

      passthrough.on("close", resolve);
      passthrough.on("end", resolve);
      passthrough.on("error", reject);

      console.log("Starting upload");
      zip.pipe(passthrough);
      for (const file of readables) {
        log.info("appending" + file.filename);
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
