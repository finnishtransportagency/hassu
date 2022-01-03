import { Kayttaja, ProjektiRooli } from "../../../common/graphql/apiModel";
import { DBVaylaUser } from "../database/model/projekti";
import { isAorL } from "../user";
import { mergeKayttaja } from "./personAdapter";
import { personSearchUpdaterClient } from "./personSearchUpdaterClient";
import { s3Cache } from "../cache/s3Cache";
import log from "loglevel";
import { Kayttajas } from "./kayttajas";
import { wrapXrayAsync } from "../aws/xray";

export const S3CACHE_TTL_MILLIS = 15 * 60 * 1000; // 15 min
export enum SearchMode {
  EMAIL,
  UID,
}

export const PERSON_SEARCH_CACHE_KEY = "users.json";

export class PersonSearchClient {
  public async getKayttajas(): Promise<Kayttajas> {
    try {
      return await wrapXrayAsync("getKayttajas", async () => {
        const kayttajaMap: Record<string, Kayttaja> = await s3Cache.get(
          PERSON_SEARCH_CACHE_KEY,
          S3CACHE_TTL_MILLIS,
          async () => {
            personSearchUpdaterClient.triggerUpdate();
          },
          async () => {
            return await personSearchUpdaterClient.readUsersFromSearchUpdaterLambda();
          }
        );
        return new Kayttajas(kayttajaMap);
      });
    } catch (e) {
      log.error("getKayttajas", e);
      throw e;
    }
  }

  public async fillInUserInfoFromUserManagement({
    user: user,
    searchMode,
  }: {
    user: Partial<DBVaylaUser>;
    searchMode: SearchMode;
  }): Promise<DBVaylaUser | undefined> {
    const kayttajas = await this.getKayttajas();
    let account: Kayttaja | undefined;

    if (searchMode === SearchMode.UID) {
      account = kayttajas.getKayttajaByUid(user.kayttajatunnus);
    } else {
      account = kayttajas.findByEmail(user.email);
    }
    if (account) {
      // Projektipaallikko must be either L or A account
      if (user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && !isAorL(account)) {
        return;
      }
      mergeKayttaja(user, account);
      return user as DBVaylaUser;
    }
    return;
  }
}

export const personSearch = new PersonSearchClient();
