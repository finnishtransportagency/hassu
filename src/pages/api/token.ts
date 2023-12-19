import { SSM } from "@aws-sdk/client-ssm";
import { NextApiRequest, NextApiResponse } from "next";

const ssm = new SSM({ region: "eu-west-1" });

async function getParameter(name: string, envVariable: string): Promise<string> {
  console.log("parameter: " + name);
  if (process.env[envVariable]) {
    return process.env[envVariable] as string;
  }
  const value = (await ssm.getParameter({ Name: name, WithDecryption: true })).Parameter?.Value;
  if (value) {
    return value;
  }
  throw new Error("Getting parameter " + name  + " failed");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query["code"] as string;
  const state = req.query["state"] as string;
  const redirect_uri = req.query["redirect_uri"] as string;
  const client_id = req.query["client_id"] as string;
  const userPoolUrlStr = await getParameter(`/${process.env.ENVIRONMENT}/outputs/SuomifiCognitoDomain`, "SUOMI_FI_COGNITO_DOMAIN");
  const userPoolUrl = new URL(userPoolUrlStr);
  userPoolUrl.pathname = "/oauth2/token";
  const details: Record<string, string> = {
    grant_type: "authorization_code",
    client_id,
    code,
    redirect_uri,
  };
  const formBody = Object.keys(details)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
    .join("&");

  const clientSecret = await getParameter("SuomifiCognitoClientSecret", "SUOMI_FI_USERPOOL_CLIENT_SECRET");
  const response = await fetch(userPoolUrl.toString(), {
    headers: {
      Authorization: "Basic " + Buffer.from(client_id + ":" + clientSecret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body: formBody,
  });
  const json = await response.json();
  if (json["access_token"]) {
    const expires = new Date(Date.now() + parseInt(json["expires_in"]) * 1000);
    // set cookie as Secure AND SameSite=Strict
    const cookie = `x-vls-access-token=${json["access_token"]};expires=${expires};path=/;Secure;SameSite=Strict`;
    res.setHeader("Set-Cookie", cookie);
  }
  res.setHeader("Location", redirect_uri + (state ?? ""));
  res.status(302).send("");
}
