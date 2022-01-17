import { log } from "../logger";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import { ProjektiProjektiLuonti } from "./projektirekisteri";
import { VelhoHakuTulos } from "../../../common/graphql/apiModel";
import { adaptProjekti, adaptSearchResults, ProjektiSearchResult } from "./velhoAdapter";
import { VelhoError } from "../error/velhoError";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { DBProjekti } from "../database/model/projekti";
import { personSearch } from "../personSearch/personSearchClient";

const axios = require("axios");
const NodeCache = require("node-cache");
const accessTokenCache = new NodeCache({
  stdTTL: 1000, // Not really used, because the TTL is set based on the expiration time specified by Velho
});
const ACCESS_TOKEN_CACHE_KEY = "accessToken";

axios.interceptors.request.use((request: AxiosRequestConfig) => {
  log.debug("Request", request.url + "\n" + JSON.stringify(request.headers) + "\n" + request.data);
  return request;
});

function stripTooLongLogs(response: AxiosResponse) {
  let data: string = `${response.data}`;
  if (data?.length > 1000) {
    data = data.slice(0, 1000) + "...";
  }
  return data;
}

axios.interceptors.response.use((response: AxiosResponse) => {
  if (response.status === 200) {
    if (log.isLevelEnabled("debug")) {
      log.debug({ response: response.status + " " + response.statusText + "\n" + stripTooLongLogs(response) });
    }
  } else {
    log.warn({ response: response.status + " " + response.statusText + "\n" + stripTooLongLogs(response) });
  }
  return response;
});

axios.defaults.timeout = 28000;

function checkResponseIsOK(response: AxiosResponse, message: string) {
  if (response.status >= 400) {
    throw new VelhoError(
      "Error while communicating with Velho: " +
        message +
        " StatusCode:" +
        response.status +
        " Status:" +
        response?.statusText
    );
  }
}

export class VelhoClient {
  public async authenticate() {
    let accessToken = accessTokenCache.get(ACCESS_TOKEN_CACHE_KEY);
    if (accessToken) {
      return accessToken;
    }
    const response = await axios.post(config.velhoAuthURL, "grant_type=client_credentials", {
      auth: { username: config.velhoUsername, password: config.velhoPassword },
    });
    accessToken = response.data.access_token;
    const expiresInSeconds = response.data.expires_in;
    // Expire token 10 seconds earlier than it really expires for safety margin
    accessTokenCache.set(ACCESS_TOKEN_CACHE_KEY, accessToken);
    accessTokenCache.ttl(ACCESS_TOKEN_CACHE_KEY, expiresInSeconds - 10);
    return accessToken;
  }

  /** Method to remove access token for testing purposes */
  public logout() {
    accessTokenCache.del(ACCESS_TOKEN_CACHE_KEY);
  }

  public async searchProjects(term: string, requireExactMatch?: boolean): Promise<VelhoHakuTulos[]> {
    try {
      const hakuApi = await this.createHakuApi();
      let searchClause;
      if (requireExactMatch) {
        searchClause = ["yhtasuuri", ["projekti/projekti", "ominaisuudet", "nimi"], term];
      } else {
        // TODO: add kunta field into target field as well
        searchClause = ["sisaltaa-tekstin", ["projekti/projekti", "ominaisuudet", "nimi"], term];
      }
      const response = await hakuApi.hakupalveluApiV1HakuKohdeluokatPost({
        asetukset: {
          palautettavat_kentat: [
            ["projekti/projekti", "oid"],
            ["projekti/projekti", "ominaisuudet", "nimi"],
            ["projekti/projekti", "ominaisuudet", "vaihe"],
            ["projekti/projekti", "ominaisuudet", "vastuuhenkilo"],
          ],
          tyyppi: HakuPalvelu.HakulausekeAsetuksetTyyppiEnum.Kohdeluokkahaku,
          jarjesta: [[["projekti/projekti", "ominaisuudet", "nimi"], "nouseva" as any]],
        },
        lauseke: [
          "ja",
          [
            "joukossa",
            ["projekti/projekti", "ominaisuudet", "vaihe"],
            ["vaihe/vaihe04", "vaihe/vaihe10", "vaihe/vaihe12"],
          ],
          ["yhtasuuri", ["projekti/projekti", "ominaisuudet", "tila"], "tila/tila15"],
          searchClause,
        ],
        kohdeluokat: ["projekti/projekti"],
      });
      checkResponseIsOK(response, "searchProjects");
      const data = response.data;
      const resultCount = data?.osumia || 0;
      if (requireExactMatch) {
        log.info(resultCount + " Velho search results for exact term: " + term);
      } else {
        log.info(resultCount + " Velho search results for term: " + term);
      }
      return adaptSearchResults(data.osumat as ProjektiSearchResult[], await personSearch.getKayttajas());
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
  }

  public async loadProjekti(oid: string): Promise<{ projekti: DBProjekti; vastuuhenkilo: string }> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid);
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "loadProjekti with oid '" + oid + "'");
    return adaptProjekti(response.data);
  }

  public async createProjektiForTesting(velhoProjekti: ProjektiProjektiLuonti): Promise<any> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      // tslint:disable-next-line:no-console
      console.log("velhoProjekti", velhoProjekti);
      response = await projektiApi.projektirekisteriApiV2ProjektiPost(velhoProjekti, true, {
        query: { "raportoi-vkm-virheet": true },
      });
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "Create projekti for testing");
    return response.data;
  }

  public async deleteProjektiForTesting(oid: string): Promise<any> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidDelete(oid);
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "Delete projekti for testing");
    return response.data;
  }

  private async createHakuApi() {
    return new HakuPalvelu.HakuApi(new HakuPalvelu.Configuration(await this.getVelhoApiConfiguration()));
  }

  private async createProjektiRekisteriApi() {
    return new ProjektiRekisteri.ProjektiApi(
      new ProjektiRekisteri.Configuration(await this.getVelhoApiConfiguration())
    );
  }

  private async getVelhoApiConfiguration() {
    return {
      basePath: config.velhoApiURL,
      baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
    };
  }
}

export const velho = new VelhoClient();
