import { Kayttaja, ProjektiRooli } from "../../../common/graphql/apiModel";
import { DBVaylaUser } from "../database/model/projekti";
import { isAorL } from "../user";
import { mergeKayttaja } from "./personAdapter";
import { personSearchUpdaterClient } from "./personSearchUpdaterClient";
import { s3Cache } from "../cache/s3Cache";
import log from "loglevel";

export const S3CACHE_TTL_MILLIS = 15 * 60 * 1000; // 15 min
export enum SearchMode {
  EMAIL,
  UID,
}

export const PERSON_SEARCH_CACHE_KEY = "users.json";

export class PersonSearchClient {
  public async listAccounts(): Promise<Kayttaja[]> {
    try {
      return await s3Cache.get(
        PERSON_SEARCH_CACHE_KEY,
        S3CACHE_TTL_MILLIS,
        async () => {
          return await personSearchUpdaterClient.triggerUpdate();
        },
        async () => {
          return await personSearchUpdaterClient.readUsersFromSearchUpdaterLambda();
        }
      );
    } catch (e) {
      log.error("listAccounts", e);
      throw e;
    }
  }

  public async fillInUserInfoFromUserManagement({
    user: user,
    searchMode,
  }: {
    user: DBVaylaUser;
    searchMode: SearchMode;
  }): Promise<DBVaylaUser | undefined> {
    const kayttajas = await this.listAccounts();
    const accounts = kayttajas.filter((account) =>
      searchMode === SearchMode.EMAIL ? account.email === user.email : account.uid === user.kayttajatunnus
    );
    if (accounts.length > 0) {
      const account = accounts[0];
      // Projektipaallikko must be either L or A account
      if (user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && !isAorL(account)) {
        return;
      }
      mergeKayttaja(user, account);
      return user;
    }
    return;
  }
}

export const personSearch = new PersonSearchClient();
