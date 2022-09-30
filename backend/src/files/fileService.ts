import { config } from "../config";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { uuid } from "../util/uuid";
import { Dayjs } from "dayjs";
// urlEscpaePath import on kunnossa
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { uriEscapePath } from "aws-sdk/lib/util";
import S3, { ListObjectsV2Output } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";
import { parseDate } from "../util/dateUtil";
import { ProjektiPaths } from "./ProjektiPath";
import { AWSError } from "aws-sdk";

export type UploadFileProperties = {
  fileNameWithPath: string;
  uploadURL: string;
};

export type CreateFileProperties = {
  oid: string;
  filePathInProjekti: string;
  fileName: string;
  contents: Buffer;
  contentType?: string;
  inline?: boolean;
  publicationTimestamp?: Dayjs;
  copyToPublic?: boolean;
};

export type DownloadFileProperties = {
  contentDisposition?: string;
  contentType?: string;
  contents: Buffer;
};

// Simple types to hold aineisto information for syncronization purposes
export type SimpleAineistoMap = { [fullFilePathInProjekti: string]: AineistoMetadata };
export type AineistoMetadata = {
  publishDate?: Dayjs;
  expirationDate?: Dayjs;
  ContentDisposition?: string;
  ContentType?: string;
};

export type PersistFileProperties = { targetFilePathInProjekti: string; uploadedFileSource: string; oid: string };

export type DeleteFileProperties = { filePathInProjekti: string; oid: string };

const S3_METADATA_PUBLISH_TIMESTAMP = "publication-timestamp";

const S3_METADATA_EXPIRATION_TIMESTAMP = "expiration-timestamp";

export class FileService {
  /**
   * Prepare upload URL for a given file. The uploaded file can be persisted to a projekti with persistFileToProjekti function call.
   */
  async createUploadURLForFile(filename: string, contentType: string): Promise<UploadFileProperties> {
    const fileNameWithPath = `${uuid.v4()}/${filename}`;
    const s3 = getS3();
    const uploadURL = s3.getSignedUrl("putObject", {
      Bucket: config.uploadBucketName,
      Key: fileNameWithPath,
      Expires: 600,
      ContentType: contentType,
    });
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
    const targetBucketPath = new ProjektiPaths(param.oid).yllapitoPath + targetPath;
    if (!config.yllapitoBucketName) {
      throw new Error("config.yllapitoBucketName määrittelemättä");
    }
    try {
      await getS3()
        .copyObject({
          ...sourceFileProperties,
          Bucket: config.yllapitoBucketName,
          Key: targetBucketPath,
          MetadataDirective: "REPLACE",
        })
        .promise();
      log.info(`Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetBucketPath}`);
      return targetPath;
    } catch (e) {
      log.error(e);
      throw new Error("Error copying file to permanent storage");
    }
  }

  /**
   * Creates a file to projekti
   */
  async createFileToProjekti(param: CreateFileProperties): Promise<string> {
    const pathWithinProjekti = `/${param.filePathInProjekti}/${param.fileName}`;
    try {
      const metadata: { [key: string]: string } = {};
      if (param.publicationTimestamp) {
        metadata[S3_METADATA_PUBLISH_TIMESTAMP] = param.publicationTimestamp.format();
      }
      if (!config.yllapitoBucketName) {
        throw new Error("config.yllapitoBucketName määrittelemättä");
      }
      await FileService.putFile(
        config.yllapitoBucketName,
        param,
        FileService.getYllapitoProjektiDirectory(param.oid) + pathWithinProjekti,
        metadata
      );

      if (param.copyToPublic) {
        if (!config.publicBucketName) {
          throw new Error("config.publicBucketName määrittelemättä");
        }
        await FileService.putFile(
          config.publicBucketName,
          param,
          FileService.getPublicProjektiDirectory(param.oid) + pathWithinProjekti,
          metadata
        );
      }

      return pathWithinProjekti;
    } catch (e) {
      log.error(e);
      throw new Error("Error creating file to yllapito");
    }
  }

  private static async putFile(bucket: string, param: CreateFileProperties, targetPath: string, metadata: { [p: string]: string }) {
    // TODO: tsekkaa että tää on oikeasti ok
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await getS3()
      .putObject({
        Body: param.contents,
        Bucket: bucket,
        Key: targetPath,
        ContentType: param.contentType,
        ContentDisposition: param.inline && "inline; filename*=UTF-8''" + encodeURIComponent(param.fileName),
        Metadata: metadata,
      })
      .promise();
    log.info(`Created file ${bucket}/${targetPath}`);
  }

  public static getYllapitoProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).yllapitoPath;
  }

  public static getPublicProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).publicPath;
  }

  async getUploadedSourceFileInformation(uploadedFileSource: string): Promise<{ ContentType: string; CopySource: string }> {
    try {
      if (!config.uploadBucketName) {
        throw new Error("config.uploadBucketName määrittelemättä");
      }
      const headObject = (await getS3().headObject({ Bucket: config.uploadBucketName, Key: uploadedFileSource }).promise()) || "";
      if (!headObject) {
        throw new Error(`headObject:ia ei saatu haettua`);
      }
      return {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ContentType: headObject.ContentType,
        CopySource: uriEscapePath(config.uploadBucketName + "/" + uploadedFileSource),
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
   * Only for integration testing
   */
  async deleteProjekti(oid: string): Promise<void> {
    if (config.env == "localstack") {
      const yllapitoProjektiDirectory = FileService.getYllapitoProjektiDirectory(oid);
      if (!config.yllapitoBucketName) {
        throw new Error("config.yllapitoBucketName määrittelemättä");
      }
      await this.deleteFilesRecursively(config.yllapitoBucketName, yllapitoProjektiDirectory);

      const publicProjektiDirectory = FileService.getPublicProjektiDirectory(oid);
      if (!config.publicBucketName) {
        throw new Error("config.publicBucketName määrittelemättä");
      }
      await this.deleteFilesRecursively(config.publicBucketName, publicProjektiDirectory);
    }
  }

  private async deleteFilesRecursively(sourceBucket: string, sourcePrefix: string) {
    const s3 = getS3();
    let ContinuationToken = undefined;
    do {
      const { Contents = [], NextContinuationToken }: ListObjectsV2Output = await s3
        .listObjectsV2({
          Bucket: sourceBucket,
          Prefix: sourcePrefix,
          ContinuationToken,
        })
        .promise();

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
    const s3 = getS3();

    await s3
      .deleteObject({
        Bucket: sourceBucket,
        Key: sourceKey,
      })
      .promise();
  }

  getYllapitoPathForProjektiFile(oid: string, path: string): string | undefined {
    return path ? `/${FileService.getYllapitoProjektiDirectory(oid)}${path}` : undefined;
  }

  getPublicPathForProjektiFile(oid: string, path: string): string {
    if (!path) {
      throw new Error("Tiedostopolku puuttuu tai on määrittelemätön");
    }
    return `/${FileService.getPublicProjektiDirectory(oid)}${path}`;
  }

  /**
   * Copy file from yllapito to public bucket
   */
  async publishProjektiFile(
    oid: string,
    yllapitoFilePathInProjekti: string,
    publicFilePathInProjekti: string,
    publishDate?: Dayjs,
    expirationDate?: Dayjs
  ): Promise<void> {
    if (!config.yllapitoBucketName) {
      throw new Error("config.yllapitoBucketName määrittelemättä");
    }
    const sourceBucket: string = config.yllapitoBucketName;
    if (!config.publicBucketName) {
      throw new Error("config.publicBucketName määrittelemättä");
    }
    const targetBucket: string = config.publicBucketName;

    const yllapitoKey = `${FileService.getYllapitoProjektiDirectory(oid)}${yllapitoFilePathInProjekti}`;
    const yllapitoMetaData = await FileService.getFileMetaData(sourceBucket, yllapitoKey);

    const metadata: { [key: string]: string } = {};
    if (yllapitoMetaData) {
      if (yllapitoMetaData.ContentDisposition) {
        metadata["ContentDisposition"] = yllapitoMetaData.ContentDisposition;
      }
      if (yllapitoMetaData.ContentType) {
        metadata["ContentType"] = yllapitoMetaData.ContentType;
      }
    } else {
      log.warn(`Possibly file not found:${sourceBucket}${yllapitoKey}`);
    }

    if (publishDate) {
      metadata[S3_METADATA_PUBLISH_TIMESTAMP] = publishDate.format();
    }
    if (expirationDate) {
      metadata[S3_METADATA_EXPIRATION_TIMESTAMP] = expirationDate.format();
    }

    const copyObjectParams = {
      Bucket: targetBucket,
      Key: `${FileService.getPublicProjektiDirectory(oid)}${publicFilePathInProjekti}`,
      CopySource: uriEscapePath(`${sourceBucket}/${yllapitoKey}`),
      MetadataDirective: "REPLACE",
      Metadata: metadata,
    };
    try {
      const copyObjectCommandOutput = await getS3().copyObject(copyObjectParams).promise();
      log.info("Publish file", { copyObjectParams, copyObjectCommandOutput });
    } catch (e) {
      log.error("CopyObject failed", e);
      throw e;
    }
  }

  async deleteYllapitoFileFromProjekti({ oid, filePathInProjekti }: DeleteFileProperties): Promise<void> {
    if (!filePathInProjekti) {
      throw new NotFoundError("BUG: tiedostonimi on annettava jotta tiedoston voi poistaa");
    }
    const projektiPath = FileService.getYllapitoProjektiDirectory(oid);
    if (!config.yllapitoBucketName) {
      throw new Error("config.yllapitoBucketName määrittelemättä");
    }
    await FileService.deleteFileFromProjekti(config.yllapitoBucketName, projektiPath + filePathInProjekti);
  }

  async deletePublicFileFromProjekti({ oid, filePathInProjekti }: DeleteFileProperties): Promise<void> {
    if (!filePathInProjekti) {
      throw new NotFoundError("BUG: tiedostonimi on annettava jotta tiedoston voi poistaa");
    }
    const projektiPath = FileService.getPublicProjektiDirectory(oid);
    if (!config.publicBucketName) {
      throw new Error("config.publicBucketName määrittelemättä");
    }
    await FileService.deleteFileFromProjekti(config.publicBucketName, projektiPath + filePathInProjekti);
  }

  private static async deleteFileFromProjekti(bucket: string, key: string): Promise<void> {
    await getS3()
      .deleteObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    log.info(`Deleted file ${bucket}/${key}`);
  }

  async listYllapitoProjektiFiles(oid: string, path: string): Promise<SimpleAineistoMap> {
    if (!config.yllapitoBucketName) {
      throw new Error("config.yllapitoBucketName määrittelemättä");
    }
    const bucketName: string = config.yllapitoBucketName;
    const s3ProjektiPath = FileService.getYllapitoProjektiDirectory(oid) + "/" + path;
    return FileService.listObjects(bucketName, s3ProjektiPath);
  }

  async listPublicProjektiFiles(oid: string, path: string, withMetadata = false): Promise<SimpleAineistoMap> {
    if (!config.publicBucketName) {
      throw new Error("config.publicBucketName määrittelemättä");
    }
    const bucketName: string = config.publicBucketName;
    const s3ProjektiPath = FileService.getPublicProjektiDirectory(oid) + "/" + path;
    return FileService.listObjects(bucketName, s3ProjektiPath, withMetadata);
  }

  private static async listObjects(bucketName: string, s3ProjektiPath: string, withMetadata = false) {
    let ContinuationToken = undefined;
    const s3 = getS3();
    const result: SimpleAineistoMap = {};

    do {
      const { Contents: contents = [], NextContinuationToken: nextContinuationToken }: ListObjectsV2Output = await s3
        .listObjectsV2({
          Bucket: bucketName,
          Prefix: s3ProjektiPath,
          ContinuationToken,
        })
        .promise();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const sourceKeys: string[] = contents.map(({ Key }) => Key);
      for (const key of sourceKeys) {
        let metadata: AineistoMetadata = {};
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

  async getPublicFileMetadata(oid: string, path: string): Promise<AineistoMetadata | undefined> {
    if (!config.publicBucketName) {
      throw new Error("config.publicBucketName määrittelemättä");
    }
    return FileService.getFileMetaData(config.publicBucketName, this.getPublicPathForProjektiFile(oid, path));
  }

  private static async getFileMetaData(bucketName: string, key: string): Promise<AineistoMetadata | undefined> {
    try {
      const keyWithoutLeadingSlash = key.replace(/^\//, "");
      const headObject = await getS3().headObject({ Bucket: bucketName, Key: keyWithoutLeadingSlash }).promise();
      // metadatan parempi olla olemassa
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const metadata: S3.Metadata = headObject.Metadata;
      const publishDate = metadata[S3_METADATA_PUBLISH_TIMESTAMP];
      const expirationDate = metadata[S3_METADATA_EXPIRATION_TIMESTAMP];
      const result: AineistoMetadata = {};
      if (headObject.ContentDisposition) {
        result.ContentDisposition = headObject.ContentDisposition;
      }
      if (headObject.ContentType) {
        result.ContentType = headObject.ContentType;
      }

      if (publishDate) {
        result.publishDate = parseDate(publishDate);
      }
      if (expirationDate) {
        result.expirationDate = parseDate(expirationDate);
      }
      return result;
    } catch (e) {
      if ((e as AWSError).code == "NotFound") {
        return undefined;
      }
      log.error(e);
      throw e;
    }
  }

  createYllapitoSignedDownloadLink(oid: string, tiedosto: string): string {
    return getS3().getSignedUrl("getObject", {
      Bucket: config.yllapitoBucketName,
      Key: new ProjektiPaths(oid).yllapitoPath + tiedosto,
      Expires: 60 * 60, // One hour
    });
  }
}

export const fileService = new FileService();
