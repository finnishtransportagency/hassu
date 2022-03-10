import { config } from "../../config";
import { adaptPersonSearchResult } from "./personSearchAdapter";
import { log } from "../../logger";
import { Kayttajas, Person } from "../kayttajas";
import { getAxios, wrapXrayAsync } from "../../aws/monitoring";

import { parseStringPromise as parseString } from "xml2js";

const axios = getAxios();

export class PersonSearchUpdater {
  private readonly personSearchAccountTypes: string[];

  constructor(personSearchAccountTypes: string[]) {
    this.personSearchAccountTypes = personSearchAccountTypes;
  }

  public async getKayttajas(): Promise<Kayttajas> {
    if (!this.personSearchAccountTypes) {
      throw new Error("Environment variable PERSON_SEARCH_API_ACCOUNT_TYPES missing");
    }
    const kayttajas: Record<string, Person> = {};
    // First list all accounts from prod
    for (const accountType of this.personSearchAccountTypes) {
      await this.listAccountsOfType(accountType, kayttajas, config.personSearchApiURLProd);
    }
    // Then add all missing accounts from dev to existing map. If the same UID has multiple emails, the test emails are ignored. This code is not supposed to be run in production.
    if (config.personSearchApiURL) {
      for (const accountType of this.personSearchAccountTypes) {
        await this.listAccountsOfType(accountType, kayttajas, config.personSearchApiURL);
      }
    }
    return new Kayttajas(kayttajas);
  }

  private async listAccountsOfType(accounttype: string, persons: Record<string, Person>, endpoint: string | undefined) {
    if (!endpoint) {
      return;
    }
    log.debug("listAccountsOfType:" + accounttype);
    const response = await axios.request({
      timeout: 120000,
      baseURL: endpoint,
      params: { accounttype },
      method: "GET",
      auth: { username: config.personSearchUsername, password: config.personSearchPassword },
    });
    if (response.status === 200) {
      const responseJson: any = await wrapXrayAsync("xmlParse", () => parseString(response.data));
      adaptPersonSearchResult(responseJson, persons);
      log.debug("listAccountsOfType:" + accounttype + " " + Object.keys(persons).length + " persons in result map");
    } else {
      log.error(response.status + " " + response.statusText);
    }
  }
}

export const personSearchUpdater = new PersonSearchUpdater(config.personSearchAccountTypes || []);
