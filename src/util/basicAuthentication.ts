import { parameterStore } from "./parameterStore";

export function createAuthorizationHeader(username: string, password: string) {
  return "Basic " + Buffer.from(username + ":" + password, "binary").toString("base64");
}

export async function validateCredentials(authorization: string | undefined): Promise<boolean> {
  let configuredCredentials: string[] | undefined = (
    await parameterStore.getParameter("/IlmoitustauluSyoteCredentials")
  )?.split("\n");
  if (!configuredCredentials || !authorization) {
    return false;
  }

  for (const credentials of configuredCredentials) {
    let usernameAndPassword = credentials.split("=");
    if (usernameAndPassword.length != 2) {
      continue;
    }
    if (authorization == createAuthorizationHeader(usernameAndPassword[0], usernameAndPassword[1])) {
      return true;
    }
  }
  return false;
}
