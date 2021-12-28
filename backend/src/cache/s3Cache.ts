import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getS3Client } from "../aws/clients";
import { config } from "../config";
import log from "loglevel";
import { Readable } from "stream";
import { streamToString } from "../util/streamUtil";

const NodeCache = require("node-cache");

export class S3Cache {
  cache: typeof NodeCache;

  constructor(inMemoryCacheTTLSeconds: number) {
    this.cache = new NodeCache({ stdTTL: inMemoryCacheTTLSeconds });
  }

  async get<T>(
    key: string,
    ttlMillis: number,
    triggerUpdate: () => void,
    populateMissingData: () => Promise<T>
  ): Promise<T> {
    const cachedData = this.cache.get(key) as T;
    if (cachedData) {
      return cachedData;
    }

    const s3Object = await this.getS3Object(key, ttlMillis);
    if (s3Object.expired) {
      log.info(`${key} expired, triggering update.`);
      triggerUpdate();
    }

    if (s3Object.data) {
      // Set only to in-memory cache. S3 cache is updated by the updater lambda.
      this.cache.set(key, s3Object.data);
      return s3Object.data;
    }

    if (s3Object.missing) {
      const data = await populateMissingData();
      // Set only to in-memory cache. S3 cache is updated by the updater lambda.
      this.cache.set(key, data);
      return data;
    }

    throw new Error("Unknown issue with S3 cache");
  }

  async getS3Object(key: string, ttlMillis: number): Promise<{ data?: any; expired?: boolean; missing?: boolean }> {
    const s3Client: S3Client = getS3Client();
    try {
      const output: GetObjectCommandOutput = await s3Client.send(
        new GetObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
        })
      );
      const fileStream = output.Body;
      if (fileStream instanceof Readable) {
        const s3json = await streamToString(fileStream);

        const lastModified = output.LastModified;
        return {
          data: JSON.parse(s3json),
          expired: S3Cache.hasExpired(lastModified, ttlMillis),
        };
      }
    } catch (e) {
      // If the cached file does not exist at all, load it synchronously. This is meant to happen only once in deployed environments.
      if (e.name === "NoSuchKey") {
        return {
          missing: true,
        };
      } else {
        log.error(e);
        throw new Error("Problem with internal S3 bucket");
      }
    }
    throw new Error("Problem with cached data: no contents in file");
  }

  private static hasExpired(lastModified: Date | undefined, ttlMillis: number) {
    return !lastModified || lastModified.getTime() + ttlMillis <= new Date().getTime();
  }

  async put(key: string, data: any): Promise<void> {
    if (!data) {
      return;
    }
    const s3Client: S3Client = getS3Client();
    let output: PutObjectCommandOutput;
    try {
      output = await s3Client.send(
        new PutObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
          Body: Buffer.from(JSON.stringify(data)),
        })
      );
    } catch (e) {
      log.error(e);
      throw new Error("Problem with internal S3 bucket");
    }
    if (output.$metadata.httpStatusCode !== 200) {
      log.error(output);
      throw new Error("Problem with internal S3 bucket");
    }
  }

  async clear(key: string): Promise<void> {
    const s3Client: S3Client = getS3Client();
    let output: DeleteObjectCommandOutput;
    try {
      output = await s3Client.send(
        new DeleteObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
        })
      );
    } catch (e) {
      log.error(e);
      throw new Error("Problem with internal S3 bucket");
    }
    const httpStatusCode = output.$metadata.httpStatusCode;
    if (httpStatusCode !== 200 && httpStatusCode !== 204) {
      log.error(output);
      throw new Error("Problem with internal S3 bucket");
    }
  }
}

export const s3Cache = new S3Cache(60); // One minute in-memory cache
