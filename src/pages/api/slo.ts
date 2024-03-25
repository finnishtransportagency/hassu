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
  const currenturl = new URL(req.headers.referer!);
  const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID!;
  const redirect_uri = new URL(await getParameter("KeycloakDomain", "KEYCLOAK_DOMAIN"));
  redirect_uri.pathname = "/keycloak/auth/realms/suomifi/protocol/openid-connect/logout";
  redirect_uri.searchParams.set("client_id", keycloakClientId);
  redirect_uri.searchParams.set("post_logout_redirect_uri", currenturl.toString());
  const cookie = [
    "x-vls-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
    "x-vls-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
  ];
  res.setHeader("Set-Cookie", cookie);
  res.setHeader("Location", redirect_uri.toString());
  res.status(302).send("");
}
