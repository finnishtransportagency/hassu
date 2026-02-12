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
  const refresh_token = req.cookies["x-vls-refresh-token"];
  let status = 404;
  if (refresh_token) {
    const client_id = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
    const userPoolUrl = new URL(process.env.NEXT_PUBLIC_KEYCLOAK_DOMAIN!);
    userPoolUrl.pathname = "/keycloak/auth/realms/suomifi/protocol/openid-connect/token";
    const details: Record<string, string> = {
      grant_type: "refresh_token",
      client_id,
      refresh_token,
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
    const { access_token, refresh_token: new_refresh_token, id_token } = await response.json();
    if (access_token && new_refresh_token && id_token) {
      // set cookie as Secure AND SameSite=Strict
      const cookie = [
        `x-vls-access-token=${access_token};path=/;Secure;SameSite=Strict;HttpOnly `,
        `x-vls-refresh-token=${new_refresh_token};path=/;Secure;SameSite=Strict;HttpOnly `,
        `x-vls-id-token=${id_token};path=/;Secure;SameSite=Strict;HttpOnly `,
      ];
      res.setHeader("Set-Cookie", cookie);
      status = 200;
    } else {
      const cookie = [
        "x-vls-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
        "x-vls-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
        "x-vls-id-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;",
      ];
      res.setHeader("Set-Cookie", cookie);
      status = 401;
    }
  }
  res.status(200).send({ status, updated: new Date().toUTCString() });
}
