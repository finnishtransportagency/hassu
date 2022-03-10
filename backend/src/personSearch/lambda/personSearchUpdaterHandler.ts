import { log } from "../../logger";
import { personSearchUpdater } from "./personSearchUpdater";
import { s3Cache } from "../../cache/s3Cache";
import { PERSON_SEARCH_CACHE_KEY, S3CACHE_TTL_MILLIS } from "../personSearchClient";
import * as AWSXRay from "aws-xray-sdk";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "../../aws/monitoring";

/**
 * This is a Lambda which lists the users fron user directory and caches it to S3. The cached list is then used by the actual
 * Hassu backend for the user lookups.
 * This Lambda is triggered by the Hassu backend if the cached list is considered outdated.
 */
export async function handleEvent() {
  setupLambdaMonitoring();

  return await AWSXRay.captureAsyncFunc("personSearchUpdaterHandler", async (subsegment) => {
    setupLambdaMonitoringMetaData(subsegment);
    try {
      const s3Object = await s3Cache.getS3Object(PERSON_SEARCH_CACHE_KEY, S3CACHE_TTL_MILLIS);
      if (s3Object.expired || s3Object.missing) {
        log.info(`Updating users cache. expired:${s3Object.expired} missing:${s3Object.missing}`);
        const kayttajas = await personSearchUpdater.getKayttajas();
        const kayttajaMap = kayttajas.asMap();
        await s3Cache.put(PERSON_SEARCH_CACHE_KEY, kayttajaMap);
        return kayttajaMap;
      } else {
        return s3Object.data;
      }
    } catch (e) {
      log.error(e);
      // Prevent updating the data too often by updating the last modified date
      await s3Cache.touch(PERSON_SEARCH_CACHE_KEY);
      throw e;
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
}
