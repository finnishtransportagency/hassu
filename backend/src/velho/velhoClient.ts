const axios = require("axios");
import { config } from "../config";

let accessTokenExpires;
let accessToken;

async function authenticate() {
  if (!accessTokenExpires || accessTokenExpires > Date.now()) {
    const response = await axios.post(config.velhoAuthURL, "grant_type=client_credentials", {
      auth: { username: config.velhoUsername, password: config.velhoPassword },
    });
    accessToken = response.data.access_token;
    const expiresInSeconds = response.data.expires_in;
    // Expire token 10 seconds earlier than it really expires for safety margin
    accessTokenExpires = Date.now() + (expiresInSeconds - 10) * 1000;
  }
  return accessToken;
}

export { authenticate };
