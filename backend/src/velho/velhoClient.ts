/* tslint:disable:no-console */
const axios = require("axios");
import { config } from "../config";

export class VelhoClient {
  accessTokenExpires;
  accessToken;

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
}

export const velho = new VelhoClient();
