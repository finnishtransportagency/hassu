import * as log from "loglevel";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu";
import * as ProjektiRekisteri from "./projektirekisteri";
import { VelhoHakuTulos } from "../api/apiModel";
import { adaptProjecti, adaptSearchResults } from "./velhoAdapter";
import { VelhoError } from "../error/velhoError";

const axios = require("axios");

axios.interceptors.request.use((request) => {
  log.debug("Request", JSON.stringify(request.headers) + "\n" + request.data);
  return request;
});

axios.interceptors.response.use((response) => {
  log.debug("Response", response.status + " " + response.statusText + "\n" + response.data);
  return response;
});

const velhoApiURL = config.velhoApiURL;

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

  public async searchProjects(name: string, requireExactMatch?: boolean): Promise<VelhoHakuTulos[]> {
    try {
      const hakuApi = await this.createHakuApi();
      let searchClause;
      if (requireExactMatch) {
        searchClause = ["tekstikysely", ["projekti/projekti", "ominaisuudet", "nimi"], name];
      } else {
        searchClause = ["sisaltaa-tekstin", ["projekti/projekti", "ominaisuudet", "nimi"], name];
      }
      const result = await hakuApi.hakupalveluApiV1HakuKohdeluokatPost({
        asetukset: {
          palautettavat_kentat: [
            ["projekti/projekti", "oid"],
            ["projekti/projekti", "ominaisuudet", "nimi"],
            ["projekti/projekti", "ominaisuudet", "vaylamuoto"],
          ],
          tyyppi: HakuPalvelu.HakulausekeAsetuksetTyyppiEnum.Kohdeluokkahaku,
          jarjesta: [[["projekti/projekti", "ominaisuudet", "nimi"], "nouseva" as any]],
        },
        lauseke: searchClause,
        kohdeluokat: ["projekti/projekti"],
      });
      const resultCount = result.data?.osumia || 0;
      if (requireExactMatch) {
        log.info(resultCount + " search results for exact term: " + name);
      } else {
        log.info(resultCount + " search results for term: " + name);
      }
      return adaptSearchResults(result.data.osumat);
    } catch (e) {
      throw new VelhoError(e);
    }
  }

  public async loadProject(oid: string) {
    const projektiApi = await this.createProjektiRekisteriApi();
    const result = await projektiApi.projektirekisteriApiV1ProjektiProjektiOidGet(oid);
    if (result.status === 200) {
      return adaptProjecti(result.data);
    }
    throw new VelhoError("Could not load project with oid '" + oid + "'. Result:" + result.statusText);
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
