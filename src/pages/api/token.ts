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

function getRedirectUri() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/";
  } else {
    return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query["code"] as string;
  const state = req.query["state"] as string;
  const redirect_uri = getRedirectUri();
  const client_id = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
  const userPoolUrl = new URL(process.env.NEXT_PUBLIC_KEYCLOAK_DOMAIN!);
  userPoolUrl.pathname = "/keycloak/auth/realms/suomifi/protocol/openid-connect/token";
  const details: Record<string, string> = {
    grant_type: "authorization_code",
    client_id,
    code,
    redirect_uri: redirect_uri + "api/token",
  };
  const formBody = Object.keys(details)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
    .join("&");

  const clientSecret = await getParameter("KeycloakClientSecret", "KEYCLOAK_CLIENT_SECRET");
  const response = await fetch(userPoolUrl.toString(), {
    headers: {
      Authorization: "Basic " + Buffer.from(client_id + ":" + clientSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body: formBody,
  });
  const { access_token, refresh_token, id_token } = await response.json();
  if (access_token && refresh_token && id_token) {
    // set cookie as Secure AND SameSite=Strict
    const cookie = [
      `x-vls-access-token=${access_token};path=/;Secure;SameSite=Strict;HttpOnly `,
      `x-vls-refresh-token=${refresh_token};path=/;Secure;SameSite=Strict;HttpOnly `,
      `x-vls-id-token=${id_token};path=/;Secure;SameSite=Strict;HttpOnly `,
    ];
    res.setHeader("Set-Cookie", cookie);
  }
  res.setHeader("Location", redirect_uri + (state ?? ""));
  res.status(302).send("");
}
