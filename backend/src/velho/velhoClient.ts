import * as log from "loglevel";
import { config } from "../config";
import * as HakuPalvelu from "./hakupalvelu/api";
import { VelhoHakuTulos } from "../api/apiModel";
import { adaptSearchResults } from "./velhoAdapter";
import { Configuration } from "./hakupalvelu";

const axios = require("axios");

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
      if (requireExactMatch) {
        log.info(result.data.osumia + " search results for exact term: " + name);
      } else {
        log.info(result.data.osumia + " search results for term: " + name);
      }
      return adaptSearchResults(result.data.osumat);
    } catch (e) {
      log.error(e);
      throw new Error(e);
    }
  }

  private async createHakuApi() {
    return new HakuPalvelu.HakuApi(
      new Configuration({
        basePath: velhoApiURL,
        baseOptions: { headers: { Authorization: "Bearer " + (await this.authenticate()) } },
      })
    );
  }
}

export const velho = new VelhoClient();
