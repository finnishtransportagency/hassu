import { config } from "../../config";
import { Kayttaja } from "../../../../common/graphql/apiModel";
import { adaptPersonSearchResult } from "./personSearchAdapter";
import * as log from "loglevel";
import { wrapXrayAsync } from "../../aws/xray";
import { Kayttajas } from "../kayttajas";

const parseString = require("xml2js").parseStringPromise;

const axios = require("axios");

function mergeListOfListsIntoMap(personLists: Kayttaja[][]): Record<string, Kayttaja> {
  return personLists.reduce((allPersons, listOfPersons) => {
    listOfPersons.forEach((kayttaja) => {
      if (kayttaja.uid) {
        allPersons[kayttaja.uid] = kayttaja;
      }
    });
    return allPersons;
  }, {} as Record<string, Kayttaja>);
}

export class PersonSearchUpdater {
  private readonly personSearchAccountTypes: string[];

  constructor(personSearchAccountTypes: string[]) {
    this.personSearchAccountTypes = personSearchAccountTypes;
  }

  public async getKayttajas(): Promise<Kayttajas> {
    if (!this.personSearchAccountTypes) {
      throw new Error("Environment variable PERSON_SEARCH_API_ACCOUNT_TYPES missing");
    }
    const personListsPerAccountType = await Promise.all(
      this.personSearchAccountTypes.map((accountType) => this.listAccountsOfType(accountType))
    );
    return new Kayttajas(mergeListOfListsIntoMap(personListsPerAccountType));
  }

  private async listAccountsOfType(accounttype: string): Promise<Kayttaja[]> {
    const response = await axios.request({
      baseURL: config.personSearchApiURL,
      params: { accounttype },
      method: "GET",
      auth: { username: config.personSearchUsername, password: config.personSearchPassword },
    });
    if (response.status === 200) {
      const responseJson: any = await wrapXrayAsync("xmlParse", () => parseString(response.data));
      return adaptPersonSearchResult(responseJson);
    } else {
      log.error(response.status + " " + response.statusText);
    }
    return [];
  }
}

export const personSearchUpdater = new PersonSearchUpdater(config.personSearchAccountTypes || []);
