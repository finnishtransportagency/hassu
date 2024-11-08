import { config } from "../config";
import { log } from "../logger";
import NodeCache from "node-cache";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, GetObjectOutput, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToString } from "../util/streamUtil";
import { getS3Client } from "../aws/client";

export class S3Cache {
  cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
  }

  async get<T>(key: string, ttlMillis: number, triggerUpdate: () => Promise<void>, populateMissingData: () => Promise<T>): Promise<T> {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      return cachedData as T;
    }

    const s3Object = await this.getS3Object<T>(key, ttlMillis);
    if (s3Object.expired) {
      log.info(`${key} expired, triggering update.`);
      await triggerUpdate();
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

  async getS3Object<T>(key: string, ttlMillis: number): Promise<{ expired?: boolean; missing?: boolean; expiresTime?: number; data?: T }> {
    try {
      const output: GetObjectOutput = await getS3Client().send(
        new GetObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
        })
      );
      const body = output.Body;
      if (body instanceof Readable) {
        const s3json = await streamToString(body);

        const lastModified = output.LastModified;
        const expiresTime = S3Cache.getExpiresTime(lastModified, ttlMillis);
        return {
          data: JSON.parse(s3json),
          expiresTime,
          expired: expiresTime <= new Date().getTime(),
        };
      }
    } catch (e: unknown) {
      // If the cached file does not exist at all, load it synchronously. This is meant to happen only once in deployed environments.
      if (e instanceof NoSuchKey) {
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
    try {
      const objectKey = "cache/" + key;
      await getS3Client().send(
        new CopyObjectCommand({
          Bucket: config.internalBucketName,
          Key: objectKey,
          CopySource: config.internalBucketName + "/" + objectKey,
          Metadata: {
            modified: `${new Date().getTime()}`, // Copy is illegal if nothing changes, so this is to make a change
          },
        })
      );
      log.info("Touch " + objectKey);
    } catch (e: unknown) {
      log.error("touch " + key + " failed", e);
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
    try {
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
          Body: Buffer.from(JSON.stringify(data)),
        })
      );
    } catch (e) {
      log.error("put failed", e);
      throw new Error("Problem with internal S3 bucket");
    }
  }

  async clear(key: string): Promise<void> {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({
          Bucket: config.internalBucketName,
          Key: "cache/" + key,
        })
      );
    } catch (e) {
      log.error("clear", e);
      throw new Error("Problem with internal S3 bucket");
    }
  }
}

export const s3Cache = new S3Cache(); // One minute in-memory cache
