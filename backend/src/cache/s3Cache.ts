import {
  CopyObjectCommand,
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
import { log } from "../logger";
import { Readable } from "stream";
import { streamToString } from "../util/streamUtil";

import NodeCache from "node-cache";

export class S3Cache {
  cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
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
      if (s3Object.expiresTime) {
        this.cache.ttl(key, (s3Object.expiresTime - Date.now()) / 1000);
      }
      return s3Object.data;
    }

    if (s3Object.missing) {
      const data = await populateMissingData();
      // Set only to in-memory cache. S3 cache is updated by the updater lambda.
      this.cache.set(key, data);
      this.cache.ttl(key, ttlMillis / 1000);
      return data;
    }

    throw new Error("Unknown issue with S3 cache");
  }

  async getS3Object(
    key: string,
    ttlMillis: number
  ): Promise<{ expired?: boolean; missing?: boolean; expiresTime?: number; data?: any }> {
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
        const expiresTime = S3Cache.getExpiresTime(lastModified, ttlMillis);
        return {
          data: JSON.parse(s3json),
          expiresTime,
          expired: expiresTime <= new Date().getTime(),
        };
      }
    } catch (e: any) {
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

  async touch(key: string): Promise<void> {
    const s3Client: S3Client = getS3Client();
    try {
      const objectKey = "cache/" + key;
      const output: GetObjectCommandOutput = await s3Client.send(
        new CopyObjectCommand({
          Bucket: config.internalBucketName,
          Key: objectKey,
          CopySource: config.internalBucketName + "/" + objectKey,
        })
      );
      log.info("Touch " + objectKey, output.$metadata);
    } catch (e: unknown) {
      log.error(e);
    }
  }

  private static getExpiresTime(lastModified: Date | undefined, ttlMillis: number) {
    if (!lastModified) {
      return 0;
    }
    return lastModified.getTime() + ttlMillis;
  }

  async put(key: string, data: unknown): Promise<void> {
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

export const s3Cache = new S3Cache(); // One minute in-memory cache
