import * as log from "loglevel";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import { VelhoHakuTulos } from "../api/apiModel";
import { adaptProjecti, adaptSearchResults } from "./velhoAdapter";
import { VelhoError } from "../error/velhoError";
import { AxiosResponse } from "axios";

const axios = require("axios");

axios.interceptors.request.use((request) => {
  log.debug("Request", JSON.stringify(request.headers) + "\n" + request.data);
  return request;
});

axios.interceptors.response.use((response) => {
  log.debug("Response", response.status + " " + response.statusText + "\n" + response.data);
  return response;
});

axios.defaults.timeout = 28000;

const velhoApiURL = config.velhoApiURL;

function checkResponseIsOK(response: AxiosResponse, message: string) {
  if (response.status !== 200) {
    throw new VelhoError("Error while communicating with Velho: " + message + " Status:" + response?.statusText);
  }
}

export class VelhoClient {
  private accessTokenExpires;
  private accessToken;

  public async authenticate() {
    if (!this.accessTokenExpires || this.accessTokenExpires < Date.now()) {
      const response = await axios.post(config.velhoAuthURL, "grant_type=client_credentials", {
        auth: { username: config.velhoUsername, password: config.velhoPassword },
      });
      this.accessToken = response.data.access_token;
      const expiresInSeconds = response.data.expires_in;
      // Expire token 10 seconds earlier than it really expires for safety margin
      this.accessTokenExpires = Date.now() + (expiresInSeconds - 10) * 1000;
    }
    return this.accessToken;
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
            ["projekti/projekti", "ominaisuudet", "vaylamuoto"],
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
          searchClause,
        ],
        kohdeluokat: ["projekti/projekti"],
      });
      checkResponseIsOK(response, "searchProjects");
      const data = response.data;
      const resultCount = data?.osumia || 0;
      if (requireExactMatch) {
        log.info(resultCount + " search results for exact term: " + term);
      } else {
        log.info(resultCount + " search results for term: " + term);
      }
      return adaptSearchResults(data.osumat);
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
  }

  public async loadProjekti(oid: string) {
    const projektiApi = await this.createProjektiRekisteriApi();
    let response;
    try {
      response = await projektiApi.projektirekisteriApiV1ProjektiProjektiOidGet(oid);
    } catch (e) {
      throw new VelhoError(e.message, e);
    }
    checkResponseIsOK(response, "loadProjekti with oid '" + oid + "'");
    return adaptProjecti(response.data);
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
      basePath: velhoApiURL,
      baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
    };
  }
}

export const velho = new VelhoClient();
