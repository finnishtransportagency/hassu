import { config } from "../../config";
import { adaptPersonSearchResult } from "./personSearchAdapter";
import { log } from "../../logger";
import { Kayttajas, Person } from "../kayttajas";
import { getAxios, wrapXRayAsync } from "../../aws/monitoring";
// parseStringPromise import on kunnossa
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { parseStringPromise as parseString } from "xml2js";
import { AxiosRequestConfig } from "axios";

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
      if (!config.personSearchApiURLProd) {
        throw new Error("config.personSearchApiURLProd määrittämättä");
      }
      if (!config.personSearchUsernameProd) {
        throw new Error("config.personSearchUsernameProd määrittämättä");
      }
      if (!config.personSearchPasswordProd) {
        throw new Error("config.personSearchPasswordProd määrittämättä");
      }
      await this.listAccountsOfType(
        accountType,
        kayttajas,
        config.personSearchApiURLProd,
        config.personSearchUsernameProd,
        config.personSearchPasswordProd
      );
    }
    // Then add all missing accounts from dev to existing map. If the same UID has multiple emails, the test emails are ignored. This code is not supposed to be run in production.
    if (config.personSearchApiURL) {
      if (!config.personSearchUsername) {
        throw new Error("config.personSearchUsername määrittämättä");
      }
      if (!config.personSearchPassword) {
        throw new Error("config.personSearchPassword määrittämättä");
      }
      for (const accountType of this.personSearchAccountTypes) {
        await this.listAccountsOfType(
          accountType,
          kayttajas,
          config.personSearchApiURL,
          config.personSearchUsername,
          config.personSearchPassword
        );
      }
    }
    return new Kayttajas(kayttajas);
  }

  private async listAccountsOfType(
    accounttype: string,
    persons: Record<string, Person>,
    endpoint: string,
    username: string,
    password: string
  ) {
    if (!endpoint) {
      return;
    }
    log.debug("listAccountsOfType:" + accounttype);
    const requestConfig: AxiosRequestConfig = {
      timeout: 120000,
      baseURL: endpoint,
      params: { accounttype },
      method: "GET",
      auth: { username, password },
    };
    try {
      const axios = getAxios();
      const response = await axios.request(requestConfig);
      if (response.status === 200) {
        const responseJson: any = await wrapXRayAsync("xmlParse", () => parseString(response.data));
        adaptPersonSearchResult(responseJson, persons);
        log.info("listAccountsOfType:" + accounttype + " " + Object.keys(persons).length + " persons in result map");
      } else {
        log.error(response.status + " " + response.statusText);
      }
    } catch (e) {
      log.error("listAccountsOfType:" + accounttype + " failed.", { requestConfig, e });
    }
  }
}

export const personSearchUpdater = new PersonSearchUpdater(config.personSearchAccountTypes || []);
