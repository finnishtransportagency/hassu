import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../src/config";
import { DBProjekti } from "../../src/database/model";
import { getDynamoDBDocumentClient, getS3Client } from "../../src/aws/client";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2CommandOutput, PutObjectCommand } from "@aws-sdk/client-s3";

export async function insertProjektiToDB<A extends Pick<DBProjekti, "oid">>(projekti: A) {
  const params = new PutCommand({
    TableName: config.projektiTableName,
    Item: projekti,
  });
  await getDynamoDBDocumentClient().send(params);
}

export async function removeProjektiFromDB(oid: string) {
  const params = new DeleteItemCommand({
    TableName: config.projektiTableName,
    Key: {
      oid: {
        S: oid,
      },
    },
  });
  await getDynamoDBDocumentClient().send(params);
}

export async function getProjektiFromDB(oid: string): Promise<any> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
  });
  const data = await getDynamoDBDocumentClient().send(params);
  if (!data.Item) {
    return;
  }
  return data.Item as any;
}

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
    await deleteFilesFromYllapito(Contents.map(({ Key }) => Key as string));

    ContinuationToken = NextContinuationToken;
  } while (ContinuationToken);
}

async function deleteFilesFromYllapito(paths: string[]) {
  if (paths.some((path) => path.includes(config.yllapitoBucketName))) {
    throw new Error("path ei saa sisältää ylläpitoBucketNamea");
  }
  await Promise.all(
    // DeleteObjectsCommand takes at most 1000 items
    getChunksOfThousand(paths).map((paths) =>
      getS3Client().send(
        new DeleteObjectsCommand({
          Bucket: config.yllapitoBucketName,
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
