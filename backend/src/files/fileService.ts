import { config } from "../config";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { uuid } from "../util/uuid";
import { Dayjs } from "dayjs";
import {
  CopyObjectCommand,
  CopyObjectRequest,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ListObjectsV2Output,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "../aws/client";
import { getCloudFront } from "../aws/clients/getCloudFront";
import { parseDate } from "../util/dateUtil";
import { PathTuple, ProjektiPaths } from "./ProjektiPath";
import isEqual from "lodash/isEqual";
import { assertIsDefined } from "../util/assertions";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { streamToBuffer } from "../util/streamUtil";

export type UploadFileProperties = {
  fileNameWithPath: string;
  uploadURL: string;
};

export type CreateFileProperties = {
  oid: string;
  path: PathTuple;
  fileName: string;
  contents: Buffer;
  contentType?: string;
  inline?: boolean;
  publicationTimestamp?: Dayjs;
  copyToPublic?: boolean;
};

// Simple types to hold file information for syncronization purposes
export type FileMap = { [fullFilePathInProjekti: string]: FileMetadata };

export class FileMetadata {
  publishDate?: Dayjs;
  expirationDate?: Dayjs;
  ContentDisposition?: string;
  ContentType?: string;
  checksum?: string;
  fileType?: FileType;

  isSame(other: FileMetadata): boolean {
    if (!other) {
      return false;
    }
    return (
      isEqual(this.ContentDisposition, other.ContentDisposition) &&
      isEqual(this.ContentType, other.ContentType) &&
      isEqual(this.expirationDate, other.expirationDate) &&
      isEqual(this.checksum, other.checksum) &&
      isEqual(this.fileType, other.fileType) &&
      (!this.publishDate || this.publishDate.isSame(other.publishDate))
    );
  }
}

export type PersistFileProperties = { targetFilePathInProjekti: string; uploadedFileSource: string; oid: string };

export type DeleteFileProperties = { filePathInProjekti: string; oid: string; reason: string };

export enum FileType {
  AINEISTO = "AINEISTO",
}

const S3_METADATA_PUBLISH_TIMESTAMP = "publication-timestamp";
const S3_METADATA_EXPIRATION_TIMESTAMP = "expiration-timestamp";
const S3_METADATA_FILE_TYPE = "filetype";

export class FileService {
  /**
   * Prepare upload URL for a given file. The uploaded file can be persisted to a projekti with persistFileToProjekti function call.
   */
  async createUploadURLForFile(filename: string, contentType: string): Promise<UploadFileProperties> {
    const fileNameWithPath = `${uuid.v4()}/${filename}`;
    const s3client = getS3Client();
    const putObjectCommand = new PutObjectCommand({
      Bucket: config.uploadBucketName,
      Key: fileNameWithPath,
      ContentType: contentType,
    });
    const uploadURL = await getSignedUrl(s3client, putObjectCommand, { expiresIn: 600 });
    return { fileNameWithPath, uploadURL };
  }

  /**
   * Moves a file from temporary upload location to a permanent location under a projekti
   */
  async persistFileToProjekti(param: PersistFileProperties): Promise<string> {
    const filePath = FileService.removePrefixFromFile(param.uploadedFileSource);
    const sourceFileProperties = await this.getUploadedSourceFileInformation(filePath);

    const fileNameFromUpload = FileService.getFileNameFromPath(filePath);
    const targetPath = `/${param.targetFilePathInProjekti}/${fileNameFromUpload}`;
    const targetBucketPath = new ProjektiPaths(param.oid).yllapitoFullPath + targetPath;
    try {
      await getS3Client().send(
        new CopyObjectCommand({
          ...sourceFileProperties,
          Bucket: config.yllapitoBucketName,
          Key: targetBucketPath,
          MetadataDirective: "REPLACE",
        })
      );
      log.info(`Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetBucketPath}`);
      return targetPath;
    } catch (e) {
      log.error(e);
      throw new Error("Error copying file to permanent storage");
    }
  }

  async createAineistoToProjekti(param: CreateFileProperties): Promise<string> {
    return this.createFileToProjekti(param, FileType.AINEISTO);
  }

  /**
   * Creates a file to projekti
   */
  async createFileToProjekti(param: CreateFileProperties, fileType?: FileType): Promise<string> {
    const filePath = `${param.path.yllapitoFullPath}/${param.fileName}`;
    let filePathInProjekti = `/${param.fileName}`;
    if (param.path.yllapitoPath !== "") {
      filePathInProjekti = `/${param.path.yllapitoPath}${filePathInProjekti}`;
    }
    try {
      const metadata: { [key: string]: string } = {};
      if (param.publicationTimestamp) {
        metadata[S3_METADATA_PUBLISH_TIMESTAMP] = param.publicationTimestamp.format();
      }
      if (fileType) {
        metadata[S3_METADATA_FILE_TYPE] = fileType;
      }
      await this.putFile(config.yllapitoBucketName, param, filePath, metadata);

      return filePathInProjekti;
    } catch (e) {
      log.error(e);
      throw new Error("Error creating file to yllapito");
    }
  }

  async getProjektiFile(oid: string, path: string): Promise<string | Buffer> {
    const filePath = this.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), path);
    let obj;
    const s3Client = getS3Client();
    try {
      obj = await s3Client.send(new GetObjectCommand({ Bucket: config.yllapitoBucketName, Key: filePath }));
      if (obj?.Body instanceof Readable) {
        return await streamToBuffer(obj.Body);
      }
    } catch (e) {
      if (e instanceof NoSuchKey) {
        throw new NotFoundError("Tiedostoa ei löydy:" + filePath);
      }
      log.error("Error reading file from yllapito", { obj, bucket: config.yllapitoBucketName, filePath });
      throw new Error("Error reading file from yllapito");
    }
    log.error('"Tuntematon tiedoston sisältö', { body: obj.Body });
    throw new Error("Tuntematon tiedoston sisältö");
  }

  private async putFile(bucket: string, param: CreateFileProperties, targetPath: string, metadata: { [p: string]: string }): Promise<void> {
    try {
      let key = targetPath;
      if (key.startsWith("/")) {
        key = key.substring(1);
      }
      await getS3Client().send(
        new PutObjectCommand({
          Body: param.contents,
          Bucket: bucket,
          Key: key,
          ContentType: param.contentType || "application/octet-stream",
          ContentDisposition: param.inline ? "inline; filename*=UTF-8''" + encodeURIComponent(param.fileName) : undefined,
          Metadata: metadata,
        })
      );
      log.info(`Created file ${bucket}/${key}`);
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  public static getYllapitoProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).yllapitoFullPath;
  }

  public static getPublicProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).publicFullPath;
  }

  async getUploadedSourceFileInformation(uploadedFileSource: string): Promise<{ ContentType: string; CopySource: string }> {
    if (!config.uploadBucketName) {
      throw new Error("config.uploadBucketName määrittelemättä");
    }
    try {
      const headObject = await getS3Client().send(new HeadObjectCommand({ Bucket: config.uploadBucketName, Key: uploadedFileSource }));
      if (!headObject) {
        throw new Error(`headObject:ia ei saatu haettua`);
      }
      assertIsDefined(headObject.ContentType);
      return {
        ContentType: headObject.ContentType,
        CopySource: encodeURIComponent(config.uploadBucketName + "/" + uploadedFileSource),
      };
    } catch (e) {
      log.error(e);
      throw new NotFoundError("Uploaded file " + uploadedFileSource + " not found.");
    }
  }

  private static getFileNameFromPath(uploadedFilePath: string): string {
    return uploadedFilePath.replace(/^[0-9a-z-]+\//, "");
  }

  private static removePrefixFromFile(uploadedFileSource: string) {
    return uploadedFileSource;
  }

  /**
   * Only for non-prod environments
   */
  async deleteProjekti(oid: string): Promise<void> {
    if (config.env !== "prod") {
      const yllapitoProjektiDirectory = FileService.getYllapitoProjektiDirectory(oid);
      await this.deleteFilesRecursively(config.yllapitoBucketName, yllapitoProjektiDirectory);

      const publicProjektiDirectory = FileService.getPublicProjektiDirectory(oid);
      await this.deleteFilesRecursively(config.publicBucketName, publicProjektiDirectory);

      assertIsDefined(config.cloudFrontDistributionId, "config.cloudFrontDistributionId määrittelemättä");
      await getCloudFront().createInvalidation({
        DistributionId: config.cloudFrontDistributionId,
        InvalidationBatch: {
          CallerReference: "deleteProjekti" + new Date().getTime(),
          Paths: {
            Quantity: 1,
            Items: ["/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), "/*")],
          },
        },
      });
    }
  }

  private async deleteFilesRecursively(sourceBucket: string, sourcePrefix: string) {
    const s3 = getS3Client();
    let ContinuationToken = undefined;
    do {
      const { Contents = [], NextContinuationToken }: ListObjectsV2CommandOutput = await s3.send(
        new ListObjectsV2Command({
          Bucket: sourceBucket,
          Prefix: sourcePrefix,
          ContinuationToken,
        })
      );
      const sourceKeys = Contents.map(({ Key }) => Key);

      await Promise.all(
        new Array(10).fill(null).map(async () => {
          while (sourceKeys.length) {
            const key = sourceKeys.pop();
            if (key) {
              await FileService.deleteFile(sourceBucket, key);
            }
          }
        })
      );

      ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);
  }

  private static async deleteFile(sourceBucket: string, sourceKey: string) {
    const s3 = getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: sourceBucket,
        Key: sourceKey,
      })
    );
  }

  getYllapitoPathForProjektiFile(paths: PathTuple, filePath: string): string {
    const result = filePath.replace(paths.yllapitoPath, paths.yllapitoFullPath);
    if (!result.includes("yllapito/")) {
      throw new Error(
        `Tiedoston ylläpitopolun luominen ei onnistunut. filePath:${filePath} yllapitoPath:${paths.yllapitoPath} yllapitoFullPath:${paths.yllapitoFullPath} result:${result}`
      );
    }
    return result;
  }

  getPublicPathForProjektiFile(paths: PathTuple, filePath: string): string {
    if (!filePath) {
      throw new Error("Tiedostopolku puuttuu tai on määrittelemätön");
    }
    const result = filePath.replace(paths.yllapitoPath, paths.publicFullPath);
    if (!result.includes("suunnitelma/")) {
      throw new Error(
        `Tiedoston julkisen polun luominen ei onnistunut. filePath:${filePath} yllapitoPath:${paths.yllapitoPath} publicFullPath:${paths.publicFullPath} result:${result}`
      );
    }
    return result;
  }

  /**
   * Copy file from yllapito to public bucket
   */
  async publishProjektiFile(
    oid: string,
    yllapitoFilePathInProjekti: string,
    publicFilePathInProjekti: string,
    fileMetaData?: FileMetadata
  ): Promise<void> {
    const sourceBucket: string = config.yllapitoBucketName;
    const targetBucket: string = config.publicBucketName;

    const yllapitoKey = `${FileService.getYllapitoProjektiDirectory(oid)}${yllapitoFilePathInProjekti}`;
    const yllapitoMetaData = await FileService.getFileMetaData(sourceBucket, yllapitoKey);

    const metadata: Record<string, string> = {};
    const objectProperties: Record<string, unknown> = {};
    if (yllapitoMetaData) {
      if (yllapitoMetaData.ContentDisposition) {
        objectProperties.ContentDisposition = yllapitoMetaData.ContentDisposition;
      }
      if (yllapitoMetaData.ContentType) {
        objectProperties.ContentType = yllapitoMetaData.ContentType;
      }
    } else {
      log.warn(`File not found:${sourceBucket}${yllapitoKey}`);
      return;
    }

    if (fileMetaData?.publishDate) {
      metadata[S3_METADATA_PUBLISH_TIMESTAMP] = fileMetaData.publishDate.format();
    }
    if (fileMetaData?.expirationDate) {
      metadata[S3_METADATA_EXPIRATION_TIMESTAMP] = fileMetaData?.expirationDate.format();
    }
    if (fileMetaData?.fileType) {
      metadata[S3_METADATA_FILE_TYPE] = fileMetaData?.fileType;
    }

    const copyObjectParams: CopyObjectRequest = {
      Bucket: targetBucket,
      Key: `${FileService.getPublicProjektiDirectory(oid)}${publicFilePathInProjekti}`,
      CopySource: encodeURIComponent(`${sourceBucket}/${yllapitoKey}`),
      MetadataDirective: "REPLACE",
      Metadata: metadata,
      ...objectProperties,
    };
    try {
      const copyObjectResult = await getS3Client().send(new CopyObjectCommand(copyObjectParams));
      const args = {
        from: copyObjectParams.CopySource,
        to: copyObjectParams.Bucket + "/" + copyObjectParams.Key,
        metadata: copyObjectParams.Metadata,
      };
      log.info("Publish file", args);
      if (!copyObjectResult) {
        log.warn("Empty copyObjectResult", { args });
      }
    } catch (e) {
      log.error("CopyObject failed", e);
      throw e;
    }
  }

  async deleteYllapitoFileFromProjekti({ oid, filePathInProjekti, reason }: DeleteFileProperties): Promise<void> {
    if (!filePathInProjekti) {
      throw new NotFoundError("BUG: tiedostonimi on annettava jotta tiedoston voi poistaa");
    }
    const projektiPath = FileService.getYllapitoProjektiDirectory(oid);
    await FileService.deleteFileFromProjekti(config.yllapitoBucketName, projektiPath + filePathInProjekti, reason);
  }

  async deletePublicFileFromProjekti({ oid, filePathInProjekti, reason }: DeleteFileProperties): Promise<void> {
    if (!filePathInProjekti) {
      throw new NotFoundError("BUG: tiedostonimi on annettava jotta tiedoston voi poistaa");
    }
    const projektiPath = FileService.getPublicProjektiDirectory(oid);
    await FileService.deleteFileFromProjekti(config.publicBucketName, projektiPath + filePathInProjekti, reason);
  }

  private static async deleteFileFromProjekti(bucket: string, key: string, reason: string): Promise<void> {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    log.info(`Deleted file ${bucket}/${key}. Reason:${reason}`);
  }

  async listYllapitoProjektiFiles(oid: string, path: string): Promise<FileMap> {
    const bucketName: string = config.yllapitoBucketName;
    const s3ProjektiPath = FileService.getYllapitoProjektiDirectory(oid) + "/" + path;
    return FileService.listObjects(bucketName, s3ProjektiPath, true);
  }

  async listPublicProjektiFiles(oid: string, path: string, withMetadata = false): Promise<FileMap> {
    const bucketName: string = config.publicBucketName;
    const s3ProjektiPath = FileService.getPublicProjektiDirectory(oid) + "/" + path;
    return FileService.listObjects(bucketName, s3ProjektiPath, withMetadata);
  }

  private static async listObjects(bucketName: string, s3ProjektiPath: string, withMetadata = false) {
    let ContinuationToken = undefined;
    const s3 = getS3Client();
    const result: FileMap = {};

    do {
      const { Contents: contents = [], NextContinuationToken: nextContinuationToken }: ListObjectsV2Output = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: s3ProjektiPath,
          ContinuationToken,
        })
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const sourceKeys: string[] = contents.map(({ Key }) => Key);
      for (const key of sourceKeys) {
        let metadata: FileMetadata = new FileMetadata();

        if (withMetadata) {
          const potentialMetadata = await FileService.getFileMetaData(bucketName, key);
          if (potentialMetadata) {
            metadata = potentialMetadata;
          }
        }
        result[key.replace(s3ProjektiPath, "")] = metadata;
      }

      ContinuationToken = nextContinuationToken;
    } while (ContinuationToken);
    return result;
  }

  private static async getFileMetaData(bucketName: string, key: string): Promise<FileMetadata | undefined> {
    try {
      const keyWithoutLeadingSlash = key.replace(/^\//, "");
      const headObject = await getS3Client().send(new HeadObjectCommand({ Bucket: bucketName, Key: keyWithoutLeadingSlash }));
      // metadatan parempi olla olemassa
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const metadata: S3.Metadata = headObject.Metadata;
      const publishDate = metadata[S3_METADATA_PUBLISH_TIMESTAMP];
      const expirationDate = metadata[S3_METADATA_EXPIRATION_TIMESTAMP];
      const fileType = metadata[S3_METADATA_FILE_TYPE];
      const result: FileMetadata = new FileMetadata();
      result.checksum = headObject.ETag;

      result.ContentDisposition = headObject.ContentDisposition;
      result.ContentType = headObject.ContentType;

      if (publishDate) {
        result.publishDate = parseDate(publishDate);
      }
      if (expirationDate) {
        result.expirationDate = parseDate(expirationDate);
      }
      if (fileType) {
        result.fileType = fileType as FileType;
      }
      return result;
    } catch (e) {
      if (e instanceof NotFound) {
        return undefined;
      }
      log.error(e);
      throw e;
    }
  }

  async createYllapitoSignedDownloadLink(oid: string, tiedosto: string): Promise<string> {
    const s3client = getS3Client();
    const getObjectCommand = new GetObjectCommand({
      Bucket: config.yllapitoBucketName,
      Key: new ProjektiPaths(oid).yllapitoFullPath + tiedosto,
    });
    return getSignedUrl(s3client, getObjectCommand, {
      expiresIn: 60 * 60, // One hour
    });
  }

  async copyYllapitoFolder(sourceFolder: PathTuple, targetFolder: PathTuple): Promise<void> {
    if (sourceFolder.yllapitoFullPath == targetFolder.yllapitoFullPath) {
      return;
    }
    try {
      const yllapitoBucketName = config.yllapitoBucketName;
      log.info(`Kopioidaan ${sourceFolder.yllapitoFullPath} -> ${targetFolder.yllapitoFullPath}`);
      const data = await getS3Client().send(
        new ListObjectsV2Command({ Prefix: sourceFolder.yllapitoFullPath, Bucket: yllapitoBucketName })
      );
      if (!data?.Contents?.length) {
        return;
      }
      const promises = data.Contents.map(async (object) => {
        if (!object.Key) {
          return;
        }
        const params: CopyObjectRequest = {
          Bucket: yllapitoBucketName,
          CopySource: encodeURIComponent(`${yllapitoBucketName}/${object.Key}`),
          Key: object.Key.replace(sourceFolder.yllapitoFullPath, targetFolder.yllapitoFullPath),
          ChecksumAlgorithm: "CRC32",
        };
        log.info(`Kopioidaan ${params.CopySource} -> ${params.Key}`);
        return getS3Client().send(new CopyObjectCommand(params));
      });
      await Promise.all(promises);
    } catch (e) {
      if (e instanceof NoSuchKey) {
        throw e;
      }
      // Ignore
      log.warn(e);
    }
  }

  async deleteProjektiFilesRecursively(projektiPaths: ProjektiPaths, subpath: string): Promise<void> {
    await this.deleteFilesRecursively(config.yllapitoBucketName, projektiPaths.yllapitoFullPath + "/" + subpath);
    await this.deleteFilesRecursively(config.publicBucketName, projektiPaths.publicFullPath + "/" + subpath);
  }
}

export const fileService = new FileService();
