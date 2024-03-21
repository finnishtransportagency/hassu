import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currenturl = new URL(req.headers.referer!);

  const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID!;
  const domain = currenturl.hostname == "localhost" ? "https://hassudev.testivaylapilvi.fi" : currenturl.origin;

  const redirect_uri = new URL("https://hassudev.testivaylapilvi.fi");
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
