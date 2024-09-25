import { config } from "../../config";
import { MemberFromResponse, PersonFromResponse, adaptPersonSearchResult } from "./personSearchAdapter";
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
    const personMap: Record<string, Person> = {};
    // First list all accounts from prod
    if (!config.personSearchApiURLProd) {
      throw new Error("config.personSearchApiURLProd määrittämättä");
    }
    if (!config.personSearchUsernameProd) {
      throw new Error("config.personSearchUsernameProd määrittämättä");
    }
    if (!config.personSearchPasswordProd) {
      throw new Error("config.personSearchPasswordProd määrittämättä");
    }
    await this.listAccounts(personMap, config.personSearchApiURLProd, config.personSearchUsernameProd, config.personSearchPasswordProd);
    // Then add all missing accounts from dev to existing map. If the same UID has multiple emails, the test emails are ignored. This code is not supposed to be run in production.
    if (config.personSearchApiURL) {
      if (!config.personSearchUsername) {
        throw new Error("config.personSearchUsername määrittämättä");
      }
      if (!config.personSearchPassword) {
        throw new Error("config.personSearchPassword määrittämättä");
      }
      await this.listAccounts(personMap, config.personSearchApiURL, config.personSearchUsername, config.personSearchPassword);
    }
    return new Kayttajas(personMap);
  }

  private personHasAllowedAccounttype = (person: PersonFromResponse): boolean =>
    this.personSearchAccountTypes.some((allowedAccounttype) =>
      person.Accounttype.some((accounttype) => accounttype.toLowerCase() === allowedAccounttype.toLocaleLowerCase())
    );

  private async listAccounts(personMap: Record<string, Person>, endpoint: string, username: string, password: string) {
    if (!endpoint) {
      return;
    }
    const members = await this.listGroupMembers(endpoint, username, password);
    const requestConfig: AxiosRequestConfig = {
      timeout: 120000,
      baseURL: endpoint,
      method: "GET",
      auth: { username, password },
    };
    try {
      const axios = getAxios();
      const response = await axios.request(requestConfig);

      if (response.status === 200) {
        const responseJson = await wrapXRayAsync("xmlParse", () => parseString(response.data));
        const personsFromResponse: PersonFromResponse[] | undefined = responseJson.person?.person?.filter(this.personHasAllowedAccounttype);
        adaptPersonSearchResult(personsFromResponse, personMap, members);
        log.info("listAccounts:" + Object.keys(personMap).length + " persons in result map");
      } else {
        log.error(response.status + " " + response.statusText, { endpoint: requestConfig.baseURL });
        throw new Error(`listAccounts failed: Person search request returned unexpected status code '${response.status}'.`);
      }
    } catch (e) {
      log.error("listAccounts failed.", { endpoint: requestConfig.baseURL, e });
      throw e;
    }
  }

  private async listGroupMembers(endpoint: string, username: string, password: string) {
    if (!endpoint) {
      return;
    }
    const idx = endpoint.indexOf("Person.svc");
    const requestConfig: AxiosRequestConfig = {
      timeout: 120000,
      baseURL: endpoint.substring(0, idx) + "group.svc/byfilter?filterproperty=DisplayName&filter=hassu_kayttaja&fetch=ObjectID,DisplayName,ExplicitMember",
      method: "GET",
      auth: { username, password },
    };
    try {
      const axios = getAxios();
      const response = await axios.request(requestConfig);
      if (response.status === 200) {
        const responseJson = await wrapXRayAsync("xmlParse", () => parseString(response.data));
        const membersFromResponse: MemberFromResponse[] | undefined = responseJson.groups.group[0].members[0].member;
        return membersFromResponse?.map(m => m.Value[0]);
      } else {
        log.error(response.status + " " + response.statusText, { endpoint: requestConfig.baseURL });
        throw new Error(`listGroupMembers failed: Group search request returned unexpected status code '${response.status}'.`);
      }
    } catch (e) {
      log.error("listGroupMembers failed.", { endpoint: requestConfig.baseURL, e });
      throw e;
    }
  }
}

export const personSearchUpdater = new PersonSearchUpdater(config.personSearchAccountTypes ?? []);
