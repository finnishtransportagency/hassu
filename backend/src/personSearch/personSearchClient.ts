import { personSearchUpdaterClient } from "./personSearchUpdaterClient";
import { s3Cache } from "../cache/s3Cache";
import { log } from "../logger";
import { Kayttajas, Person } from "./kayttajas";
import { wrapXRayAsync } from "../aws/monitoring";

export const S3CACHE_TTL_MILLIS = 60 * 60 * 1000; // 60 min
export enum SearchMode {
  EMAIL,
  UID,
}

export const PERSON_SEARCH_CACHE_KEY = "users.json";

async function getKayttajas(): Promise<Kayttajas> {
  try {
    return await wrapXRayAsync("getKayttajas", async () => {
      const kayttajaMap: Record<string, Person> = await s3Cache.get(
        PERSON_SEARCH_CACHE_KEY,
        S3CACHE_TTL_MILLIS,
        async () => {
          await personSearchUpdaterClient.triggerUpdate();
        },
        async () => {
          return await personSearchUpdaterClient.readUsersFromSearchUpdaterLambda();
        }
      );
      return new Kayttajas(kayttajaMap);
    });
  } catch (e) {
    log.error("getKayttajas", { e });
    throw e;
  }
}

export const personSearch = { getKayttajas };
