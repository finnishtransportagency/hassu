import { log } from "../logger";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import * as AineistoPalvelu from "./aineistopalvelu";
import { VelhoAineisto, VelhoAineistoKategoria, VelhoHakuTulos } from "../../../common/graphql/apiModel";
import { adaptDokumenttiTyyppi, adaptProjekti, adaptSearchResults, ProjektiSearchResult } from "./velhoAdapter";
import { VelhoError } from "../error/velhoError";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { DBProjekti } from "../database/model";
import { personSearch } from "../personSearch/personSearchClient";
import dayjs from "dayjs";
import { aineistoKategoriat } from "../../../common/aineistoKategoriat";

const axios = require("axios");
const NodeCache = require("node-cache");
const accessTokenCache = new NodeCache({
  stdTTL: 1000, // Not really used, because the TTL is set based on the expiration time specified by Velho
});
const ACCESS_TOKEN_CACHE_KEY = "accessToken";

axios.interceptors.request.use((request: AxiosRequestConfig) => {
  const contentType = request.headers["content-type"];

  if (contentType && contentType.includes("image")) {
    log.debug("Request", { url: request.url });
  } else {
    log.debug("Request", { url: request.url, data: stripTooLongLogs(request.data) });
  }

  return request;
});

function stripTooLongLogs(data: unknown) {
  if (!data) {
    return undefined;
  }
  const text = JSON.stringify(data);
  if (text.length > 10000) {
    return text.slice(0, 10000) + "...";
  }
  return data;
}

function logResponse(level: string, response: AxiosResponse, contentType?: string) {
  if (contentType && contentType.includes("image")) {
    log[level]({ response: { status: response.status, statusText: response.statusText } });
  } else {
    log[level]({
      response: {
        status: response.status,
        statusText: response.statusText,
        data: response.headers?.["content-type"] != "binary/octet-stream" ? stripTooLongLogs(response.data) : undefined,
      },
    });
  }
}

axios.interceptors.response.use((response: AxiosResponse) => {
  const contentType: string | undefined = response.headers["content-type"];

  if (response.status < 400) {
    if (log.isLevelEnabled("debug")) {
      logResponse("debug", response, contentType);
    }
  } else {
    logResponse("warn", response, contentType);
  }
  return response;
});

axios.defaults.timeout = 28000;

function checkResponseIsOK(response: AxiosResponse, message: string) {
  if (response.status >= 400) {
    throw new VelhoError(
      "Error while communicating with Velho: " + message + " StatusCode:" + response.status + " Status:" + response?.statusText
    );
  }
}

export class VelhoClient {
  public async authenticate(): Promise<string> {
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
  public logout(): void {
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
          "palautettavat-kentat": [
            ["projekti/projekti", "oid"],
            ["projekti/projekti", "ominaisuudet", "nimi"],
            ["projekti/projekti", "ominaisuudet", "vaihe"],
            ["projekti/projekti", "ominaisuudet", "vastuuhenkilo"],
          ],
          tyyppi: HakuPalvelu.HakulausekeAsetuksetTyyppiEnum.Kohdeluokkahaku,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jarjesta: [[["projekti/projekti", "ominaisuudet", "nimi"], "nouseva" as any]], // NOSONAR
        },
        lauseke: [
          "ja",
          ["joukossa", ["projekti/projekti", "ominaisuudet", "vaihe"], ["vaihe/vaihe04", "vaihe/vaihe10", "vaihe/vaihe12"]],
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
      log.error(e.message, e);
      throw new VelhoError(e.message, e);
    }
  }

  public async loadProjekti(oid: string): Promise<DBProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid);
    } catch (e) {
      log.error(e);
      return adaptProjekti(e.response.data.value); // TODO temporary hack, remove after velho has been fixed
      // throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "loadProjekti with oid '" + oid + "'");
    return adaptProjekti(response.data);
  }

  public async loadProjektiAineistot(oid: string): Promise<VelhoAineistoKategoria[]> {
    try {
      const toimeksiannot = await this.listToimeksiannot(oid);
      const hakuApi = await this.createHakuApi();
      const aineistot: Record<string, VelhoAineisto[]> = await toimeksiannot.reduce(
        async (resultPromise: Promise<Record<string, VelhoAineisto[]>>, toimeksianto) => {
          // List aineistot belonging to one toimeksianto
          const aineistotResponse = await hakuApi.hakupalveluApiV1HakuAineistotLinkitOidGet(toimeksianto.oid);
          checkResponseIsOK(aineistotResponse, "hakuApi.hakupalveluApiV1HakuAineistotLinkitOidGet " + toimeksianto.oid);
          const aineistoArray: AineistoPalvelu.AineistoAineisto[] = aineistotResponse.data as AineistoPalvelu.AineistoAineisto[];
          const results = await resultPromise;

          const kategoria = toimeksianto.ominaisuudet.nimi.trim();
          if (!results[kategoria]) {
            results[kategoria] = [];
          }
          aineistoArray.forEach((aineisto) => {
            const { dokumenttiTyyppi } = adaptDokumenttiTyyppi(`${aineisto.metatiedot.dokumenttityyppi}`);
            const tiedostoNimi = aineisto["tuorein-versio"].nimi;
            results[kategoria].push({
              __typename: "VelhoAineisto",
              oid: aineisto.oid,
              tiedosto: tiedostoNimi,
              kategoriaId: aineistoKategoriat.findKategoria(aineisto.metatiedot.kuvaus, tiedostoNimi)?.id,
              dokumenttiTyyppi,
              muokattu: dayjs(aineisto["tuorein-versio"].muokattu).format(),
            } as VelhoAineisto);
          });
          return results;
        },
        {} as Record<string, VelhoAineisto[]>
      );

      // Convert map to a list of kategoria->aineistot pairs
      const result: VelhoAineistoKategoria[] = [];
      for (const kategoria in aineistot) {
        result.push({ __typename: "VelhoAineistoKategoria", kategoria, aineistot: aineistot[kategoria] });
      }
      return result;
    } catch (e) {
      log.error(e);
      throw new VelhoError(e.message, e);
    }
  }

  public async getLinkForDocument(dokumenttiOid: string): Promise<string> {
    const dokumenttiApi = await this.createDokumenttiApi();
    const dokumenttiResponse = await dokumenttiApi.aineistopalveluApiV1AineistoOidDokumenttiGet(dokumenttiOid, undefined, {
      maxRedirects: 0,
      validateStatus(status) {
        return status >= 200 && status < 400;
      },
    });
    return dokumenttiResponse.headers.location;
  }

  private async listToimeksiannot(oid: string) {
    const projektiApi = await this.createProjektiRekisteriApi();
    const toimeksiannotResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidToimeksiannotGet(oid);
    const toimeksiannot = [];
    toimeksiannotResponse.data.forEach((toimeksianto) => toimeksiannot.push(toimeksianto));
    return toimeksiannot;
  }

  public async createProjektiForTesting(
    velhoProjekti: ProjektiRekisteri.ProjektiProjektiLuonti
  ): Promise<ProjektiRekisteri.ProjektiProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      // tslint:disable-next-line:no-console
      console.log("velhoProjekti", velhoProjekti);
      response = await projektiApi.projektirekisteriApiV2ProjektiPost(velhoProjekti, true, {
        params: { "raportoi-vkm-virheet": true },
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new VelhoError(e.message, e);
      } else {
        throw new VelhoError("createProjektiForTesting");
      }
    }
    checkResponseIsOK(response, "Create projekti for testing");
    return response.data;
  }

  public async deleteProjektiForTesting(oid: string): Promise<ProjektiRekisteri.ProjektiProjekti> {
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
    return new ProjektiRekisteri.ProjektiApi(new ProjektiRekisteri.Configuration(await this.getVelhoApiConfiguration()));
  }

  // private async createAineistoApi() {
  //   return new AineistoPalvelu.AineistoApi(new AineistoPalvelu.Configuration(await this.getVelhoApiConfiguration()));
  // }

  private async createDokumenttiApi() {
    return new AineistoPalvelu.DokumenttiApi(new AineistoPalvelu.Configuration(await this.getVelhoApiConfiguration()));
  }

  private async getVelhoApiConfiguration() {
    return {
      basePath: config.velhoApiURL,
      baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
    };
  }
}

export const velho = new VelhoClient();
