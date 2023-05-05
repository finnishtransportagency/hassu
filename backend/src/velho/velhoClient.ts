import { log, recordVelhoLatencyDecorator } from "../logger";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import { ProjektiToimeksiannotInner } from "./projektirekisteri";
import * as AineistoPalvelu from "./aineistopalvelu";
import { VelhoAineisto, VelhoHakuTulos, VelhoToimeksianto } from "../../../common/graphql/apiModel";
import { adaptDokumenttiTyyppi, adaptKasittelyntilaToVelho, adaptProjekti, adaptSearchResults, ProjektiSearchResult } from "./velhoAdapter";
import { VelhoError } from "../error/velhoError";
import { AxiosRequestConfig, AxiosResponse, AxiosStatic } from "axios";
import { DBProjekti, KasittelynTila } from "../database/model";
import { personSearch } from "../personSearch/personSearchClient";
import dayjs from "dayjs";
import { getAxios } from "../aws/monitoring";
import { assertIsDefined } from "../util/assertions";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { PartiallyMandatory } from "../aineisto/PartiallyMandatory";

const NodeCache = require("node-cache");
const accessTokenCache = new NodeCache({
  stdTTL: 1000, // Not really used, because the TTL is set based on the expiration time specified by Velho
});
const ACCESS_TOKEN_CACHE_KEY = "accessToken";

function checkResponseIsOK(response: AxiosResponse, message: string) {
  if (response.status >= 400) {
    throw new VelhoError(
      "Error while communicating with Velho: " + message + " StatusCode:" + response.status + " Status:" + response?.statusText
    );
  }
}

export class VelhoClient {
  public async authenticate(): Promise<string> {
    const axios = getAxios();
    let accessToken = accessTokenCache.get(ACCESS_TOKEN_CACHE_KEY);
    if (accessToken) {
      return accessToken;
    }
    const response = await this.callAuthenticate(axios);
    accessToken = response.data.access_token;
    const expiresInSeconds = response.data.expires_in;
    // Expire token 10 seconds earlier than it really expires for safety margin
    accessTokenCache.set(ACCESS_TOKEN_CACHE_KEY, accessToken);
    accessTokenCache.ttl(ACCESS_TOKEN_CACHE_KEY, expiresInSeconds - 10);
    return accessToken;
  }

  @recordVelhoLatencyDecorator
  private async callAuthenticate(axios: AxiosStatic) {
    assertIsDefined(config.velhoAuthURL, "process.env.VELHO_AUTH_URL puuttuu");
    assertIsDefined(config.velhoUsername, "process.env.VELHO_USERNAME puuttuu");
    assertIsDefined(config.velhoPassword, "process.env.VELHO_PASSWORD puuttuu");
    return axios.post(config.velhoAuthURL, "grant_type=client_credentials", {
      auth: { username: config.velhoUsername, password: config.velhoPassword },
    });
  }

  /** Method to remove access token for testing purposes */
  public logout(): void {
    accessTokenCache.del(ACCESS_TOKEN_CACHE_KEY);
  }

  @recordVelhoLatencyDecorator
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
            ["projekti/projekti", "ominaisuudet", "asiatunnus-vaylavirasto"],
            ["projekti/projekti", "ominaisuudet", "asiatunnus-ely"],
            ["projekti/projekti", "ominaisuudet", "asiatunnus-traficom"],
            ["projekti/projekti", "ominaisuudet", "tilaajaorganisaatio"],
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
    } catch (e: unknown) {
      log.error(e);
      throw new VelhoError(e instanceof Error ? e.message : String(e), e);
    }
  }

  @recordVelhoLatencyDecorator
  public async loadProjekti(oid: string): Promise<DBProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid);
    } catch (e: any) {
      log.error(e);
      return adaptProjekti(e.response.data.value); // TODO temporary hack, remove after velho has been fixed
      // throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "loadProjekti with oid '" + oid + "'");
    return adaptProjekti(response.data);
  }

  @recordVelhoLatencyDecorator
  public async loadProjektiAineistot(oid: string): Promise<VelhoToimeksianto[]> {
    try {
      const toimeksiannot: ProjektiToimeksiannotInner[] = await this.listToimeksiannot(oid);
      const hakuApi = await this.createHakuApi();
      const result = await Promise.all<VelhoToimeksianto>(
        toimeksiannot.map(async (toimeksianto) => {
          const aineistotResponse = await hakuApi.hakupalveluApiV1HakuAineistotLinkitOidGet(toimeksianto.oid);
          checkResponseIsOK(aineistotResponse, "hakuApi.hakupalveluApiV1HakuAineistotLinkitOidGet " + toimeksianto.oid);
          const aineistoArray = aineistotResponse.data as AineistoPalvelu.AineistoAineisto[];
          const nimi: string = toimeksianto.ominaisuudet.nimi.trim();

          const aineistot: VelhoAineisto[] = aineistoArray
            .filter(
              (aineisto): aineisto is PartiallyMandatory<AineistoPalvelu.AineistoAineisto, "tuorein-versio"> => !!aineisto["tuorein-versio"]
            )
            .map((aineisto) => {
              const { dokumenttiTyyppi } = adaptDokumenttiTyyppi(`${aineisto.metatiedot.dokumenttityyppi}`);
              const tiedostoNimi = aineisto["tuorein-versio"].nimi;
              const muokattu = aineisto["tuorein-versio"].muokattu;
              return {
                __typename: "VelhoAineisto",
                oid: aineisto.oid,
                tiedosto: tiedostoNimi,
                kuvaus: aineisto.metatiedot.kuvaus || "",
                dokumenttiTyyppi,
                muokattu: dayjs(muokattu).format(),
              };
            });
          return { __typename: "VelhoToimeksianto", nimi, aineistot, oid: toimeksianto.oid };
        })
      );
      return result;
    } catch (e: unknown) {
      log.error(e);
      throw new VelhoError(e instanceof Error ? e.message : String(e), e);
    }
  }

  @recordVelhoLatencyDecorator
  public async getLinkForDocument(dokumenttiOid: string): Promise<string> {
    const dokumenttiApi = await this.createDokumenttiApi();
    const dokumenttiResponse = await dokumenttiApi.aineistopalveluApiV1AineistoOidDokumenttiGet(dokumenttiOid);
    return dokumenttiResponse.headers.location;
  }

  public async getAineisto(dokumenttiOid: string): Promise<{ disposition: string; contents: Buffer }> {
    const sourceURL = await velho.getLinkForDocument(dokumenttiOid);
    const axiosResponse = await getAxios().get(sourceURL, { responseType: "arraybuffer" });
    const disposition: string = axiosResponse.headers["content-disposition"];
    const contents = axiosResponse.data;
    return { disposition, contents };
  }

  private async listToimeksiannot(oid: string): Promise<ProjektiToimeksiannotInner[]> {
    const projektiApi = await this.createProjektiRekisteriApi();
    const toimeksiannotResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidToimeksiannotGet(oid);
    const toimeksiannot: ProjektiToimeksiannotInner[] = [];
    toimeksiannotResponse.data.forEach((toimeksianto) => toimeksiannot.push(toimeksianto));
    return toimeksiannot;
  }

  @recordVelhoLatencyDecorator
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

  @recordVelhoLatencyDecorator
  public async saveProjekti(oid: string, params: KasittelynTila): Promise<void> {
    if (process.env.VELHO_READ_ONLY == "true") {
      throw new Error("Velho on lukutilassa testeissä. Lisää kutsu mockSaveProjektiToVelho().");
    }
    const projektiApi = await this.createProjektiRekisteriApi();
    try {
      const loadProjektiResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidGet(oid);
      checkResponseIsOK(loadProjektiResponse, "Load projekti from Velho before saving");
      const projekti = loadProjektiResponse.data;
      adaptKasittelyntilaToVelho(projekti, params);
      const saveResponse = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidPut(oid, projekti);
      checkResponseIsOK(saveResponse, "Save projekti to Velho");
    } catch (e: unknown) {
      if (e instanceof IllegalArgumentError) {
        throw e;
      } else if (e instanceof Error) {
        throw new VelhoError(e.message, e);
      } else {
        throw new VelhoError("saveProjekti");
      }
    }
  }

  @recordVelhoLatencyDecorator
  public async deleteProjektiForTesting(oid: string): Promise<ProjektiRekisteri.ProjektiProjekti> {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV2ProjektiProjektiOidDelete(oid);
    } catch (e: unknown) {
      log.error(e);
      throw new VelhoError(e instanceof Error ? e.message : String(e), e);
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
    const baseConfig = await this.getVelhoApiConfiguration();
    const baseOptions = baseConfig.baseOptions as AxiosRequestConfig;
    baseOptions.maxRedirects = 0;
    baseOptions.validateStatus = (status) => {
      return status >= 200 && status < 400;
    };
    return new AineistoPalvelu.DokumenttiApi(new AineistoPalvelu.Configuration(baseConfig));
  }

  private async getVelhoApiConfiguration() {
    return {
      basePath: config.velhoApiURL,
      baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
    };
  }
}

export const velho = new VelhoClient();
