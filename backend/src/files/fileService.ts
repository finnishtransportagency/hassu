import { config } from "../config";
import { log } from "../logger";
import { IllegalArgumentError, NotFoundError } from "hassu-common/error";
import { uuid } from "hassu-common/util/uuid";
import { Dayjs } from "dayjs";
import {
  CopyObjectCommand,
  CopyObjectRequest,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
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
import { SisainenProjektiPaths, PathTuple, ProjektiPaths } from "./ProjektiPath";
import isEqual from "lodash/isEqual";
import { assertIsDefined } from "../util/assertions";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { Readable } from "stream";
import { streamToBuffer } from "../util/streamUtil";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { FILE_PATH_DELETED_PREFIX } from "hassu-common/links";
import { Aineisto } from "../database/model";
import Mail from "nodemailer/lib/mailer";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import fileValidation from "hassu-common/fileValidationSettings";
import { adaptFileName, joinPath } from "../tiedostot/paths";
import adaptS3ObjectOutputToMailAttachment from "./adaptS3ObjectToMailAttachment";

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
  expirationDate?: Dayjs;
  copyToPublic?: boolean;
  bucketName?: string;
  fileType?: FileType;
  asiakirjaTyyppi?: AsiakirjaTyyppi;
  kieli?: KaannettavaKieli;
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
  asiakirjaTyyppi?: string;

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
      isEqual(this.asiakirjaTyyppi, other.asiakirjaTyyppi) &&
      (!this.publishDate || this.publishDate.isSame(other.publishDate))
    );
  }
}

export type PersistFileProperties = {
  targetFilePathInProjekti: string;
  uploadedFileSource: string;
  oid: string;
  asiakirjaTyyppi?: AsiakirjaTyyppi;
  kieli?: Kieli;
};

export type DeleteFileProperties = { filePathInProjekti: string; oid: string; reason: string };

export enum FileType {
  AINEISTO = "AINEISTO",
}

const S3_METADATA_PUBLISH_TIMESTAMP = "publication-timestamp";
const S3_METADATA_EXPIRATION_TIMESTAMP = "expiration-timestamp";
export const S3_METADATA_FILE_TYPE = "filetype";
export const S3_METADATA_ASIAKIRJATYYPPI = "asiakirjatyyppi";
export const S3_METADATA_KIELI = "kieli";

export class FileService {
  /**
   * Prepare upload URL for a given file. The uploaded file can be persisted to a projekti with persistFileToProjekti function call.
   */
  // https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932
  async createUploadURLForFile(
    filename: string,
    contentType: string
  ): Promise<{
    fileNameWithPath: string;
    uploadURL: string;
    uploadFields: string;
  }> {
    this.validateContentType(contentType);

    const fileNameWithPath = `${uuid.v4()}/${adaptFileName(filename)}`;
    const s3 = getS3Client();
    const presignedPost = await createPresignedPost(s3, {
      Bucket: config.uploadBucketName,
      Key: fileNameWithPath,
      Fields: {
        "Content-Type": contentType,
      },
      Expires: 600,
      Conditions: [{ "Content-Type": contentType }, ["content-length-range", 0, fileValidation.maxFileSize]],
    });

    return { fileNameWithPath, uploadURL: presignedPost.url, uploadFields: JSON.stringify(presignedPost.fields) };
  }

  /**
   * Varmista, että ladattava tiedosto on jokin sallituista tiedostotyypeistä
   * @param contentType
   * @private
   */
  private validateContentType(contentType: string) {
    if (!fileValidation.allowedFileTypes.some((allowedType) => contentType.startsWith(allowedType))) {
      log.error("Tiedostotyyppi ei ole sallittu! (" + contentType + ")");
      throw new IllegalArgumentError("Tiedostotyyppi ei ole sallittu!");
    }
  }

  /**
   * Moves a file from temporary upload location to a permanent location under a projekti
   */
  async persistFileToProjekti(param: PersistFileProperties): Promise<string | undefined> {
    const filePath = FileService.removePrefixFromFile(param.uploadedFileSource);
    const sourceFileProperties = await getUploadedSourceFileInformation(filePath);
    if (!sourceFileProperties) {
      return;
    }
    const fileNameFromUpload = removeBucketFromPath(filePath);
    const targetPath = `/${param.targetFilePathInProjekti}/${fileNameFromUpload}`;
    const targetBucketPath = new ProjektiPaths(param.oid).yllapitoFullPath + targetPath;
    try {
      const metadata: { [key: string]: string } = {};
      if (param.asiakirjaTyyppi) {
        metadata[S3_METADATA_ASIAKIRJATYYPPI] = param.asiakirjaTyyppi;
      }
      if (param.kieli) {
        metadata[S3_METADATA_KIELI] = param.kieli;
      }
      await getS3Client().send(
        new CopyObjectCommand({
          ...sourceFileProperties,
          Bucket: config.yllapitoBucketName,
          Key: targetBucketPath,
          MetadataDirective: "REPLACE",
          Metadata: metadata,
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
    param.fileType = FileType.AINEISTO;
    return this.createFileToProjekti(param);
  }

  /**
   * Creates a file to projekti
   */
  async createFileToProjekti(param: CreateFileProperties): Promise<string> {
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
      if (param.fileType) {
        metadata[S3_METADATA_FILE_TYPE] = param.fileType;
      }
      if (param.asiakirjaTyyppi) {
        metadata[S3_METADATA_ASIAKIRJATYYPPI] = param.asiakirjaTyyppi;
      }
      if (param.kieli) {
        metadata[S3_METADATA_KIELI] = param.kieli;
      }
      await this.putFile(param.bucketName ?? config.yllapitoBucketName, param, filePath, metadata);

      return filePathInProjekti;
    } catch (e) {
      log.error(e);
      throw new Error("Error creating file to yllapito");
    }
  }

  async getProjektiFile(oid: string, path: string): Promise<Buffer> {
    const { Body } = await this.getProjektiYllapitoS3Object(oid, path);
    if (Body instanceof Readable) {
      return await streamToBuffer(Body);
    }
    log.error("Tuntematon tiedoston sisältö", { body: typeof Body });
    throw new Error("Tuntematon tiedoston sisältö");
  }

  async getProjektiYllapitoS3Object(oid: string, path: string): Promise<GetObjectCommandOutput> {
    const filePath = this.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), path);
    const s3Client = getS3Client();
    try {
      return await s3Client.send(new GetObjectCommand({ Bucket: config.yllapitoBucketName, Key: filePath }));
    } catch (e) {
      if (e instanceof NoSuchKey) {
        throw new NotFoundError("Tiedostoa ei löydy:" + filePath);
      }
      log.error("Error reading file from yllapito", { bucket: config.yllapitoBucketName, filePath });
      throw new Error("Error reading file from yllapito");
    }
  }

  private async putFile(bucket: string, param: CreateFileProperties, targetPath: string, metadata: { [p: string]: string }): Promise<void> {
    try {
      let key = targetPath;
      if (key.startsWith("/")) {
        key = key.substring(1);
      }

      let contentDisposition = undefined;
      if (param.inline !== undefined) {
        const inlineOrAttachment = param.inline ? "inline" : "attachment";
        contentDisposition = inlineOrAttachment + "; filename*=UTF-8''" + encodeURIComponent(this.getFileNameFromFilePath(param.fileName));
      }
      await getS3Client().send(
        new PutObjectCommand({
          Body: param.contents,
          Bucket: bucket,
          Key: key,
          ContentType: param.contentType ?? "application/octet-stream",
          ContentDisposition: contentDisposition,
          Metadata: metadata,
        })
      );
      log.info(`Created file ${bucket}/${key}`);
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  public getFileNameFromFilePath(fileName: string): string {
    const lastSlash = fileName.lastIndexOf("/");
    if (lastSlash >= 0) {
      return fileName.substring(lastSlash + 1);
    }
    return fileName;
  }

  public static getYllapitoSisainenProjektiDirectory(oid: string): string {
    return new SisainenProjektiPaths(oid).yllapitoFullPath;
  }

  public static getYllapitoProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).yllapitoFullPath;
  }

  public static getPublicProjektiDirectory(oid: string): string {
    return new ProjektiPaths(oid).publicFullPath;
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

      const yllapitoSisainenProjektiDirectory = FileService.getYllapitoSisainenProjektiDirectory(oid);
      await this.deleteFilesRecursively(config.yllapitoBucketName, yllapitoSisainenProjektiDirectory);

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

  async deleteFilesRecursively(sourceBucket: string, sourcePrefix: string) {
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
              await this.deleteFile(sourceBucket, key);
            }
          }
        })
      );

      ContinuationToken = NextContinuationToken;
    } while (ContinuationToken);
  }

  private async deleteFile(sourceBucket: string, sourceKey: string) {
    const s3 = getS3Client();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: sourceBucket,
        Key: sourceKey,
      })
    );
  }

  getYllapitoPathForProjektiFile(paths: PathTuple, filePath: string): string {
    if (filePath.startsWith(FILE_PATH_DELETED_PREFIX)) {
      return filePath;
    }
    if (paths.yllapitoPath.match("hyvaksymisesitys")) {
      /*
      Hyväksymisesitysten tiedostoista tallennetaan DynamoDB:hen vain tiedostonimi.
      Tämä poikkeuskäsittely on epätyydyttävä ratkaisu. Pidemmällä aikavälillä voisi harkita sitä,
      että kaikki tiedostot tallennettaisiin vain nimellään, ja polku, esim. nahtavillaolo/2/ pääteltäisiin kontekstista
      */
      return paths.yllapitoFullPath + "/" + filePath;
    } else if (filePath.match(paths.yllapitoPath)) {
      return filePath.replace(paths.yllapitoPath, paths.yllapitoFullPath);
    } else {
      throw new Error(
        `Tiedoston ylläpitopolun luominen ei onnistunut. filePath:${filePath} yllapitoPath:${paths.yllapitoPath} yllapitoFullPath:${paths.yllapitoFullPath}`
      );
    }
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
    if (fileMetaData?.asiakirjaTyyppi) {
      metadata[S3_METADATA_ASIAKIRJATYYPPI] = fileMetaData?.asiakirjaTyyppi;
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

  async deleteYllapitoSisainenFileFromProjekti({ oid, filePathInProjekti, reason }: DeleteFileProperties): Promise<void> {
    if (!filePathInProjekti) {
      throw new NotFoundError("BUG: tiedostonimi on annettava jotta tiedoston voi poistaa");
    }
    const projektiPath = FileService.getYllapitoSisainenProjektiDirectory(oid);
    await FileService.deleteFileFromProjekti(config.yllapitoBucketName, projektiPath + filePathInProjekti, reason);
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

  async getFileContentLength(bucketName: string, key: string): Promise<number | undefined> {
    const headObject = await FileService.getHeadObject(bucketName, key);
    return headObject.ContentLength;
  }

  private static async getHeadObject(bucketName: string, key: string) {
    const keyWithoutLeadingSlash = key.replace(/^\//, "");
    return await getS3Client().send(new HeadObjectCommand({ Bucket: bucketName, Key: keyWithoutLeadingSlash }));
  }

  private static async getFileMetaData(bucketName: string, key: string): Promise<FileMetadata | undefined> {
    try {
      const headObject = await FileService.getHeadObject(bucketName, key);
      // metadatan parempi olla olemassa
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const metadata: S3.Metadata = headObject.Metadata;
      const publishDate = metadata[S3_METADATA_PUBLISH_TIMESTAMP];
      const expirationDate = metadata[S3_METADATA_EXPIRATION_TIMESTAMP];
      const fileType = metadata[S3_METADATA_FILE_TYPE];
      const asiakirjaTyyppi = metadata[S3_METADATA_ASIAKIRJATYYPPI];
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
      if (asiakirjaTyyppi) {
        result.asiakirjaTyyppi = asiakirjaTyyppi;
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

  /**
   *
   * @param oid projektin oid
   * @param tiedosto tiedoston polku projektin tiedostot tai sisaiset -kansion projektikohtaisen kansion alla
   * @param sisaiset sijaitseeko tiedosto sisaiset-kansiossa
   */
  async createYllapitoSignedDownloadLink(oid: string, tiedosto: string): Promise<string> {
    const fullPath = joinPath(new ProjektiPaths(oid).yllapitoFullPath, tiedosto);
    return this.createSignedDownloadLink(fullPath);
  }

  /**
   *
   * @param path tiedoston täydellinen polku ylläpito-bucketissa
   */
  async createSignedDownloadLink(path: string): Promise<string> {
    const s3client = getS3Client();
    const getObjectCommand = new GetObjectCommand({
      Bucket: config.yllapitoBucketName,
      Key: path,
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

  async deleteAineisto(
    oid: string,
    aineisto: Aineisto,
    yllapitoFilePathInProjekti: string,
    publicFilePathInProjekti: string,
    reason: string
  ): Promise<void> {
    const fullFilePathInProjekti = aineisto.tiedosto;
    if (fullFilePathInProjekti) {
      // Do not try to delete file that was not yet imported to system
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: fullFilePathInProjekti,
        reason,
      });

      // Transform yllapito file path to public one to support cases when they differ
      const publicFullFilePathInProjekti = fullFilePathInProjekti.replace(yllapitoFilePathInProjekti, publicFilePathInProjekti);
      await fileService.deletePublicFileFromProjekti({
        oid,
        filePathInProjekti: publicFullFilePathInProjekti,
        reason,
      });
    }
  }

  async getFileAsAttachment(oid: string, key: string): Promise<Mail.Attachment | undefined> {
    return (await this.getFileAsAttachmentAndItsSize(oid, key)).attachment;
  }

  async getFileAsAttachmentAndItsSize(
    oid: string,
    key: string
  ): Promise<{ attachment: Mail.Attachment | undefined; size: number | undefined }> {
    try {
      log.info("Haetaan s3:sta sähköpostiin liitetiedosto", { key });
      const output = await this.getProjektiYllapitoS3Object(oid, key);
      return { attachment: adaptS3ObjectOutputToMailAttachment(output, key), size: output.ContentLength };
    } catch (error) {
      log.error("Virhe liitetiedostojen haussa", { error });
    }
    return { attachment: undefined, size: undefined };
  }
}

export async function getUploadedSourceFileInformation(
  uploadedFileSource: string
): Promise<{ ContentType: string; CopySource: string } | undefined> {
  if (!config.uploadBucketName) {
    throw new Error("config.uploadBucketName määrittelemättä");
  }
  // Sometimes path starts with / and sometimes not(?!)
  uploadedFileSource = uploadedFileSource.replace(/^\//, "");
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
    if (e instanceof NotFound) {
      log.error("Uploaded file " + uploadedFileSource + " not found.");
    } else {
      log.error("Getting uploaded file " + uploadedFileSource + " failed", { error: e });
      throw e;
    }
  }
}

export function removeBucketFromPath(uploadedFilePath: string): string {
  return uploadedFilePath.replace(/^\/?[.0-9a-z-]+\//, "");
}

export const fileService = new FileService();
