import log from "loglevel";

const JWT = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const Axios = require("axios");

let cachedKeys = null;

// Fetch JWK's from Cognito or cache
const getPublicKeys = async (issuerUrl) => {
  if (!cachedKeys) {
    cachedKeys = {};
    const publicKeys = await Axios.default.get(issuerUrl + "/.well-known/jwks.json");
    for (const key of publicKeys.data.keys) {
      cachedKeys[key.kid] = jwkToPem(key);
    }
    return cachedKeys;
  } else {
    return cachedKeys;
  }
};

const validateJwtToken = async (token, dataToken, issuer) => {
  if (!token) {
    log.debug("IAM JWT Token missing");
    return false;
  }
  // Split token into parts
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    log.error("Invalid token");
    return false;
  }

  // Parse header & payload from token parts
  const tokenHeader = JSON.parse(Buffer.from(tokenParts[0], "base64").toString("utf-8"));
  const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));

  // Fetch public keys from Cognito
  const publicKeys = await getPublicKeys(tokenPayload.iss);
  const publicKey = publicKeys[tokenHeader.kid];
  if (!publicKey) {
    log.log("Public key not found");
    return false;
  }

  // Verify token
  const result = JWT.verify(token, publicKey, { issuer });
  if (!result) {
    log.error("Failed to verify JWT");
    return false;
  }

  // Check use access
  if (result.token_use !== "access") {
    log.error("Invalid token use");
    return false;
  }

  // Return decoded data token
  return JWT.decode(dataToken.replace(/=/g, ""));
};

export { validateJwtToken };
