import { config } from "../config";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { uuid } from "../util/uuid";
import { ArchivedProjektiKey } from "../database/projektiDatabase";
import { Dayjs } from "dayjs";
import { uriEscapePath } from "aws-sdk/lib/util";
import { ListObjectsV2Output } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";

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

export type PersistFileProperties = { targetFilePathInProjekti: string; uploadedFileSource: string; oid: string };

export class FileService {
  /**
   * Prepare upload URL for a given file. The uploaded file can be persisted to a projekti with persistFileToProjekti function call.
   */
  async createUploadURLForFile(filename: string): Promise<UploadFileProperties> {
    const fileNameWithPath = `${uuid.v4()}/${filename}`;
    const s3 = getS3();
    const uploadURL = s3.getSignedUrl("putObject", {
      Bucket: config.uploadBucketName,
      Key: fileNameWithPath,
      Expires: 600,
      ContentType: "application/octet-stream",
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
    const targetBucketPath = FileService.getYllapitoProjektiDirectory(param.oid) + targetPath;
    try {
      await getS3()
        .copyObject({
          ...sourceFileProperties,
          Bucket: config.yllapitoBucketName,
          Key: targetBucketPath,
          MetadataDirective: "REPLACE",
        })
        .promise();
      log.info(
        `Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetBucketPath}`
      );
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
        metadata["publication-timestamp"] = param.publicationTimestamp.format();
      }
      await FileService.putFile(
        config.yllapitoBucketName,
        param,
        FileService.getYllapitoProjektiDirectory(param.oid) + pathWithinProjekti,
        metadata
      );

      if (param.copyToPublic) {
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

  private static async putFile(
    bucket: string,
    param: CreateFileProperties,
    targetPath: string,
    metadata: { [p: string]: string }
  ) {
    await getS3()
      .putObject({
        Body: param.contents,
        Bucket: bucket,
        Key: targetPath,
        ContentType: param.contentType,
        ContentDisposition: param.inline && "inline; filename=" + param.fileName,
        Metadata: metadata,
      })
      .promise();
    log.info(`Created file ${bucket}/${targetPath}`);
  }

  private static getYllapitoProjektiDirectory(oid: string) {
    return `yllapito/tiedostot/projekti/${oid}`;
  }

  private static getPublicProjektiDirectory(oid: string) {
    return `tiedostot/suunnitelma/${oid}`;
  }

  async getUploadedSourceFileInformation(
    uploadedFileSource: string
  ): Promise<{ ContentType: string; CopySource: string }> {
    try {
      const headObject = await getS3()
        .headObject({ Bucket: config.uploadBucketName, Key: uploadedFileSource })
        .promise();
      return {
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

  async archiveProjekti({ oid, timestamp }: ArchivedProjektiKey): Promise<void> {
    const s3 = getS3();
    const sourcePrefix = FileService.getYllapitoProjektiDirectory(oid);
    const targetPrefix = sourcePrefix + "/" + timestamp;
    const sourceBucket = config.yllapitoBucketName;
    const targetBucket = config.archiveBucketName;

    let ContinuationToken = undefined;
    const copyFile = async (sourceKey: string) => {
      const targetKey = sourceKey.replace(sourcePrefix, targetPrefix);

      await s3
        .copyObject({
          Bucket: targetBucket,
          Key: targetKey,
          CopySource: uriEscapePath(`${sourceBucket}/${sourceKey}`),
          MetadataDirective: "REPLACE",
        })
        .promise();

      await s3
        .deleteObject({
          Bucket: sourceBucket,
          Key: sourceKey,
        })
        .promise();
    };

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
              await copyFile(key);
            }
          }
        })
      );

      ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);
  }

  getYllapitoPathForProjektiFile(oid: string, path: string): string | undefined {
    return path ? `/${FileService.getYllapitoProjektiDirectory(oid)}${path}` : undefined;
  }

  getPublicPathForProjektiFile(oid: string, path: string): string | undefined {
    return path ? `/${FileService.getPublicProjektiDirectory(oid)}${path}` : undefined;
  }

  /**
   * Copy file from yllapito to public bucket
   */
  async publishProjektiFile(oid: string, filePathInProjekti: string, publishDate?: Dayjs): Promise<void> {
    const sourceBucket = config.yllapitoBucketName;
    const targetBucket = config.publicBucketName;

    const metadata: { [key: string]: string } = {};
    if (publishDate) {
      metadata["publication-timestamp"] = publishDate.format();
    }
    const copyObjectParams = {
      Bucket: targetBucket,
      Key: `${FileService.getPublicProjektiDirectory(oid)}${filePathInProjekti}`,
      CopySource: uriEscapePath(
        `${sourceBucket}/${FileService.getYllapitoProjektiDirectory(oid)}${filePathInProjekti}`
      ),
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
}

export const fileService = new FileService();
