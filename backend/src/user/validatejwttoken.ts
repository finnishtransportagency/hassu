import { log } from "../logger";
import JWT, { JwtPayload } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { getAxios } from "../aws/monitoring";

let cachedKeys: Record<string, string>;

// Fetch JWK's from Cognito or cache
const getPublicKeys = async (issuerUrl: string) => {
  if (!cachedKeys) {
    cachedKeys = {};
    const publicKeys = await getAxios().get(issuerUrl + "/.well-known/jwks.json");
    for (const key of publicKeys.data.keys) {
      cachedKeys[key.kid] = jwkToPem(key);
    }
    return cachedKeys;
  } else {
    return cachedKeys;
  }
};

const validateJwtToken = async (token: string | undefined, dataToken: string, issuer: string): Promise<JwtPayload | undefined> => {
  if (!token) {
    log.debug("IAM JWT Token missing");
    return;
  }
  // Split token into parts
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    log.error("Invalid token");
    return;
  }

  // Parse header & payload from token parts
  const tokenHeader = JSON.parse(Buffer.from(tokenParts[0], "base64").toString("utf-8"));
  const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));

  // Fetch public keys from Cognito
  const publicKeys = await getPublicKeys(tokenPayload.iss);
  const publicKey = publicKeys[tokenHeader.kid];
  if (!publicKey) {
    log.error("Public key not found");
    return;
  }

  // Verify token
  const result = JWT.verify(token, publicKey, { issuer }) as JwtPayload;
  if (!result) {
    log.error("Failed to verify JWT");
    return;
  }

  // Check use access
  if (result.token_use !== "access") {
    log.error("Invalid token use");
    return;
  }

  // Return decoded data token
  return JWT.decode(dataToken.replace(/=/g, "")) as JwtPayload;
};

export { validateJwtToken };
