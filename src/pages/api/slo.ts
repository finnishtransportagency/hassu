import { SSM } from "@aws-sdk/client-ssm";
import { NextApiRequest, NextApiResponse } from "next";

const ssm = new SSM({ region: "eu-west-1" });

async function getParameter(name: string, envVariable: string): Promise<string> {
  if (process.env[envVariable]) {
    return process.env[envVariable] as string;
  }
  const value = (await ssm.getParameter({ Name: name, WithDecryption: true })).Parameter?.Value;
  if (value) {
    return value;
  }
  throw new Error("Getting parameter " + name + " failed");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currenturl = new URL(req.url!, `https://${req.headers.host}`);

  const keycloakClientId = await getParameter(`/${process.env.INFRA_ENVIRONMENT}/KeycloakClientId`, "KEYCLOAK_CLIENT_ID");
  const keycloakLogoutPath = await getParameter(`/${process.env.INFRA_ENVIRONMENT}/KeycloakLogoutPath`, "KEYCLOAK_LOGOUT_PATH");
  const domain = currenturl.hostname == "localhost" ? "https://hassudev.testivaylapilvi.fi" : currenturl.origin;

  const redirect_uri = new URL(domain);
  redirect_uri.pathname = keycloakLogoutPath;
  redirect_uri.searchParams.set("client_id", keycloakClientId);
  redirect_uri.searchParams.set("post_logout_redirect_uri", domain);

  const cookie = "x-vls-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  res.setHeader("Set-Cookie", cookie);
  res.setHeader("Location", redirect_uri.toString());
  res.status(302).send("");
}
