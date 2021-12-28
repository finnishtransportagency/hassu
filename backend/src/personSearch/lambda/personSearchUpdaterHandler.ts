import log from "loglevel";
import { setupXRay, wrapXrayAsync } from "../../aws/xray";
import { personSearchUpdater } from "./personSearchUpdater";
import { s3Cache } from "../../cache/s3Cache";
import { PERSON_SEARCH_CACHE_KEY, S3CACHE_TTL_MILLIS } from "../personSearchClient";

/**
 * This is a Lambda which lists the users fron user directory and caches it to S3. The cached list is then used by the actual
 * Hassu backend for the user lookups.
 * This Lambda is triggered by the Hassu backend if the cached list is considered outdated.
 */
export async function handleEvent() {
  setupXRay();

  return await wrapXrayAsync("personSearchUpdaterHandler", async () => {
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
      throw e;
    }
  });
}
