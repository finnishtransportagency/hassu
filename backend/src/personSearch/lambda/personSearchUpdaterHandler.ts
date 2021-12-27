import log from "loglevel";
import { setupXRay, wrapXrayAsync } from "../../aws/xray";
import { personSearchUpdater } from "./personSearchUpdater";
import { s3Cache } from "../../cache/s3Cache";
import { PERSON_SEARCH_CACHE_KEY } from "../personSearchClient";

/**
 * This is a Lambda which lists the users fron user directory and caches it to S3. The cached list is then used by the actual
 * Hassu backend for the user lookups.
 * This Lambda is triggered by the Hassu backend if the cached list is considered outdated.
 */
export async function handleEvent() {
  setupXRay();

  return await wrapXrayAsync("personSearchUpdaterHandler", async () => {
    try {
      const kayttajas = await personSearchUpdater.listAccounts();
      await s3Cache.put(PERSON_SEARCH_CACHE_KEY, kayttajas);
      return kayttajas;
    } catch (e) {
      log.error(e);
      throw e;
    }
  });
}
