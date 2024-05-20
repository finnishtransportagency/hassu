import { config } from "../../src/config";
import { getS3Client } from "../../src/aws/client";
import { DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2CommandOutput, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { adaptFileName } from "../../src/tiedostot/paths";
import { getAxios } from "../../src/aws/monitoring";
import FormData from "form-data";

export async function insertYllapitoFileToS3(pathInS3: string) {
  if (pathInS3.includes(config.yllapitoBucketName)) {
    throw new Error("path ei saa sisältää ylläpitoBucketNamea");
  }
  const buffer = Buffer.from("Test");
  await getS3Client().send(
    new PutObjectCommand({
      Body: buffer,
      Bucket: config.yllapitoBucketName,
      Key: pathInS3,
    })
  );
}

export async function insertUploadFileToS3(uuid: string, filename: string) {
  const fileNameWithPath = `${uuid}/${adaptFileName(filename)}`;
  const presignedPost = await createPresignedPost(getS3Client(), {
    Bucket: config.uploadBucketName,
    Key: fileNameWithPath,
    Expires: 600,
  });
  const fields = presignedPost.fields;
  const form = new FormData();
  Object.keys(fields).forEach((key) => {
    form.append(key, fields[key]);
  });
  form.append("file", "Test");
  const axios = getAxios();
  const lengthSync = form.getLengthSync();

  await axios.post(presignedPost.url, form, {
    headers: {
      "Content-Length": lengthSync,
      ...form.getHeaders(),
    },
  });
}

export async function deleteYllapitoFiles(sourcePrefix?: string) {
  if (sourcePrefix && sourcePrefix.includes(config.yllapitoBucketName)) {
    throw new Error("sourcePrefix ei saa sisältää yllapitoBucketNamea");
  }
  const s3 = getS3Client();
  let ContinuationToken = undefined;
  do {
    const { Contents = [], NextContinuationToken }: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.yllapitoBucketName,
        Prefix: sourcePrefix,
        ContinuationToken,
      })
    );
    await deleteFiles(Contents.map(({ Key }) => Key as string));

    ContinuationToken = NextContinuationToken;
  } while (ContinuationToken);
}

export async function emptyUploadFiles() {
  const s3 = getS3Client();
  let ContinuationToken = undefined;
  do {
    const { Contents = [], NextContinuationToken }: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.uploadBucketName,
        ContinuationToken,
      })
    );
    await deleteFiles(
      Contents.map(({ Key }) => Key as string),
      config.uploadBucketName
    );

    ContinuationToken = NextContinuationToken;
  } while (ContinuationToken);
}

async function deleteFiles(paths: string[], bucket: string = config.yllapitoBucketName) {
  if (paths.some((path) => path.includes(config.yllapitoBucketName))) {
    throw new Error("path ei saa sisältää ylläpitoBucketNamea");
  }
  await Promise.all(
    // DeleteObjectsCommand takes at most 1000 items
    getChunksOfThousand(paths).map((paths) =>
      getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: paths.map((path) => ({ Key: path })) },
        })
      )
    )
  );
}

function getChunksOfThousand<T>(array: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += 1000) {
    chunks.push(array.slice(i, i + 1000));
  }
  return chunks;
}

export async function getYllapitoFilesUnderPath(pathInS3: string): Promise<string[]> {
  const s3 = getS3Client();
  const files: string[] = [];
  let ContinuationToken = undefined;
  do {
    const { Contents = [], NextContinuationToken }: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.yllapitoBucketName,
        Prefix: pathInS3,
        ContinuationToken,
      })
    );
    files.push(...Contents.map(({ Key }) => Key as string));
    ContinuationToken = NextContinuationToken;
  } while (ContinuationToken);
  return files;
}
