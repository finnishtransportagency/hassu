import { config } from "../config";
import { Kayttaja } from "../api/apiModel";

const parseString = require("xml2js").parseStringPromise;

const axios = require("axios");

function getFirstElementFromArrayOrEmpty(strings: string[]) {
  return strings?.[0] || "";
}

function adaptPersonSearchResult(responseJson: any): Kayttaja[] {
  return responseJson.person.person.map(
    (person) =>
      ({
        __typename: "Kayttaja",
        vaylaKayttaja: true,
        etuNimi: getFirstElementFromArrayOrEmpty(person.FirstName),
        sukuNimi: getFirstElementFromArrayOrEmpty(person.LastName),
        uid: getFirstElementFromArrayOrEmpty(person.AccountName),
      } as Kayttaja)
  );
}

export class PersonSearchClient {
  public async listAccounts(): Promise<Kayttaja[]> {
    const response = await axios.request({
      baseURL: config.personSearchApiURL,
      method: "GET",
      auth: { username: config.personSearchUsername, password: config.personSearchPassword },
    });
    if (response.status === 200) {
      const responseJson = await parseString(response.data);
      return adaptPersonSearchResult(responseJson);
    }
    return;
  }
}

export const personSearch = new PersonSearchClient();
