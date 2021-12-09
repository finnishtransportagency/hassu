import { config } from "../config";
import { Kayttaja, ProjektiRooli } from "../../../common/graphql/apiModel";
import { DBVaylaUser } from "../database/model/projekti";
import { adaptPersonSearchResult, mergeKayttaja } from "./personAdapter";
import * as log from "loglevel";
import { isAorL } from "../user";

const NodeCache = require("node-cache");

export const cache = new NodeCache({ stdTTL: 600 });

const parseString = require("xml2js").parseStringPromise;

const axios = require("axios");

function mergeListOfListsAsOneList(personLists: Kayttaja[][]) {
  return personLists.reduce((allPersons, listOfPersons) => {
    return allPersons.concat(listOfPersons);
  }, []);
}

export enum SearchMode {
  EMAIL,
  UID,
}

export class PersonSearchClient {
  public async listAccounts(): Promise<Kayttaja[]> {
    if (!config.personSearchAccountTypes) {
      throw new Error("Environment variable PERSON_SEARCH_API_ACCOUNT_TYPES missing");
    }
    const personListsPerAccountType = await Promise.all(
      config.personSearchAccountTypes.map((accountType) => this.listAccountsOfType(accountType))
    );
    return mergeListOfListsAsOneList(personListsPerAccountType);
  }

  public async listAccountsOfType(accounttype: string): Promise<Kayttaja[]> {
    const cacheKey = "PersonSearchClient-" + accounttype;
    const cachedPersons = cache.get(cacheKey) as Kayttaja[];
    if (cachedPersons) {
      return cachedPersons;
    }

    const response = await axios.request({
      baseURL: config.personSearchApiURL,
      params: { accounttype },
      method: "GET",
      auth: { username: config.personSearchUsername, password: config.personSearchPassword },
    });
    if (response.status === 200) {
      const responseJson = await parseString(response.data);
      const persons = adaptPersonSearchResult(responseJson);
      cache.set(cacheKey, persons);
      return persons;
    } else {
      log.error(response.status + " " + response.statusText);
    }
    return [];
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
