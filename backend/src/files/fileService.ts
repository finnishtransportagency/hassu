import { config } from "../config";
import { log } from "../logger";
import { NotFoundError } from "../error/NotFoundError";
import { getS3Client } from "../aws/clients";
import { uuid } from "../util/uuid";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ArchivedProjektiKey } from "../database/projektiDatabase";

export type UploadFileProperties = {
  fileNameWithPath: string;
  uploadURL: string;
};

export type CreateFileProperties = {
  oid: string;
  filePathInProjekti: string;
  fileName: string;
  contents: Buffer;
};

export type PersistFileProperties = { targetFilePathInProjekti: string; uploadedFileSource: string; oid: string };

export class FileService {
  /**
   * Prepare upload URL for a given file. The uploaded file can be persisted to a projekti with persistFileToProjekti function call.
   */
  async createUploadURLForFile(filename: string): Promise<UploadFileProperties> {
    const fileNameWithPath = `${uuid.v4()}/${filename}`;
    const command = new PutObjectCommand({
      Key: fileNameWithPath,
      Bucket: config.uploadBucketName,
    });
    const uploadURL = await getSignedUrl(getS3Client(), command, {
      expiresIn: 600,
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
    const targetPath =
      FileService.getProjektiDirectory(param.oid) + `/${param.targetFilePathInProjekti}/${fileNameFromUpload}`;
    try {
      await getS3Client().send(
        new CopyObjectCommand({
          ...sourceFileProperties,
          Bucket: config.yllapitoBucketName,
          Key: targetPath,
          MetadataDirective: "REPLACE",
        })
      );
      log.info(
        `Copied uploaded file (${sourceFileProperties.ContentType}) ${sourceFileProperties.CopySource} to ${targetPath}`
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
    const targetPath = FileService.getProjektiDirectory(param.oid) + pathWithinProjekti;
    try {
      const commandOutput = await getS3Client().send(
        new PutObjectCommand({
          Body: param.contents,
          Bucket: config.yllapitoBucketName,
          Key: targetPath,
        })
      );
      log.info(`Created file ${targetPath}`, commandOutput.$metadata);
      return pathWithinProjekti;
    } catch (e) {
      log.error(e);
      throw new Error("Error creating file to yllapito");
    }
  }

  private static getProjektiDirectory(oid: string) {
    return `yllapito/tiedostot/projekti/${oid}`;
  }

  async getUploadedSourceFileInformation(
    uploadedFileSource: string
  ): Promise<{ ContentType: string; CopySource: string }> {
    try {
      const headObject = await getS3Client().send(
        new HeadObjectCommand({ Bucket: config.uploadBucketName, Key: uploadedFileSource })
      );
      return { ContentType: headObject.ContentType, CopySource: config.uploadBucketName + "/" + uploadedFileSource };
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
    const sourcePrefix = FileService.getProjektiDirectory(oid);
    const targetPrefix = sourcePrefix + "/" + timestamp;
    const sourceBucket = config.yllapitoBucketName;
    const targetBucket = config.archiveBucketName;

    let ContinuationToken;
    const s3Client = getS3Client();
    const copyFile = async (sourceKey: string) => {
      const targetKey = sourceKey.replace(sourcePrefix, targetPrefix);

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: targetBucket,
          Key: targetKey,
          CopySource: `${sourceBucket}/${sourceKey}`,
        })
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: sourceBucket,
          Key: sourceKey,
        })
      );
    };

    do {
      const { Contents = [], NextContinuationToken }: ListObjectsV2CommandOutput = await s3Client.send(
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
              await copyFile(key);
            }
          }
        })
      );

      ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);
  }

  getYllapitoPathForProjektiFile(oid: string, path: string): string {
    return `/${FileService.getProjektiDirectory(oid)}${path}`;
  }
}

export const fileService = new FileService();
