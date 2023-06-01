import storage from "node-persist";
import dayjs from "dayjs";
import { velho, VelhoClient } from "../../../src/velho/velhoClient";
import * as sinon from "sinon";
import mocha from "mocha";
import { log } from "../../../src/logger";
import MockDate from "mockdate";

const CACHE_TTL_DAYS = 30;
const CACHE_REFRESH_DAYS = 29;

async function initCache() {
  return storage.init({
    ttl:  dayjs().add(CACHE_TTL_DAYS, "days").diff(dayjs()),
    parse: (str) => {
      // Korjataan stringiksi muutetut bufferit takaisin buffereiksi
      return JSON.parse(str, (k, v) => {
        if (v !== null && typeof v === "object" && "type" in v && v.type === "Buffer" && "data" in v && Array.isArray(v.data)) {
          return Buffer.from(v.data);
        }
        return v;
      });
    },
  });
}

const originalVelhoClient = new VelhoClient();

function cacheVelhoClientMethod<T>(velhoClientMethod: keyof typeof originalVelhoClient, originalFunc: (...argz: any[]) => Promise<T>) {
  let aStub: sinon.SinonStub;
  mocha.before(() => {
    aStub = sinon.stub(velho, velhoClientMethod);
  });
  mocha.beforeEach(async () => {
    if (!storage.removeExpiredItems) {
      doWithoutMockDate(async () => {
        await initCache();
      });
    }

    aStub.callsFake(
      async (...args: any[]): Promise<unknown> =>
        doWithoutMockDate(async () => {
          const cachekey = velhoClientMethod + JSON.stringify(args);
          const cachedResult = await storage.getDatum(cachekey);
          if (cachedResult && cachedResult.ttl) {
            const now = Date.now();
            const timeToTTL = (cachedResult.ttl || now) - now;
            const daysToExpiration = timeToTTL / 1000 / 3600 / 24;
            if (daysToExpiration < CACHE_REFRESH_DAYS) {
              try {
                const result = await originalFunc(...args);
                await storage.setItem(cachekey, result);
                return result;
              } catch (e) {
                // Ignore because there is a cached value anyway
                log.warn(e);
              }
            }
            // Käytetään cachetettua tulosta jos päivitettyä tulosta ei ole saatavilla
            return cachedResult.value;
          }
          const result = await originalFunc(...args);
          await storage.setItem(cachekey, result);
          return result;
        })
    );
  });
}

function doWithoutMockDate(func: () => void) {
  const savedDate = Date.now();
  MockDate.reset();
  try {
    return func();
  } finally {
    MockDate.set(savedDate);
  }
}

export function velhoCache(): void {
  cacheVelhoClientMethod("loadProjekti", (oid) => originalVelhoClient.loadProjekti(oid));
  cacheVelhoClientMethod("loadProjektiAineistot", (oid) => originalVelhoClient.loadProjektiAineistot(oid));
  cacheVelhoClientMethod("searchProjects", (term, requireExactMatch) => originalVelhoClient.searchProjects(term, requireExactMatch));
  cacheVelhoClientMethod("getAineisto", (oid) => originalVelhoClient.getAineisto(oid));
  cacheVelhoClientMethod("getLinkForDocument", (oid) => originalVelhoClient.getLinkForDocument(oid)); // Tuottaa expiroituvia linkkejä, jotka eivät oikeasti toimi. Jos haluat ladata aineistoja oikeasti, käytä getAineisto-metodia
}
