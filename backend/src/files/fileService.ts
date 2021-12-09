import { config } from "../config";
import log from "loglevel";
import { NotFoundError } from "../error/NotFoundError";
import { getS3Client } from "../aws/clients";
import { uuid } from "../util/uuid";
import { CopyObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type UploadFileProperties = {
  fileNameWithPath: string;
  uploadURL: string;
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
  async persistFileToProjekti(param: PersistFileProperties) {
    const filePath = this.removePrefixFromFile(param.uploadedFileSource);
    const sourceFileProperties = await this.getUploadedSourceFileInformation(filePath);

    const fileNameFromUpload = this.getFileNameFromPath(filePath);
    const targetPath = `yllapito/tiedostot/projekti/${param.oid}/${param.targetFilePathInProjekti}/${fileNameFromUpload}`;
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

  getFileNameFromPath(uploadedFilePath: string) {
    return uploadedFilePath.replace(/^[0-9a-z-]+\//, "");
  }

  removePrefixFromFile(uploadedFileSource: string) {
    return uploadedFileSource;
  }
}

export const fileService = new FileService();
