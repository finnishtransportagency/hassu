import type { NextApiRequest, NextApiResponse } from "next";
import { HttpRequest } from "@smithy/protocol-http";
import { HeaderBag } from "@aws-sdk/types";
import { sendSignedRequest } from "../../../backend/src/aws/awsRequest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.ENVIRONMENT === "prod") {
    return res.status(404).setHeader("Content-Type", "text/plain; charset=UTF-8").send("Sivua ei löydy");
  }
  let body = req.body;
  const urlObject = new URL(process.env["APPSYNC_URL"] || "");
  const isYllapito = req.query.yllapito == "true";
  const isPlayground = req.headers["referer"]?.indexOf("graphql-playground");

  let headers = {
    host: urlObject.host,
  } as unknown as HeaderBag;
  if (isYllapito || isPlayground) {
    headers["x-hassudev-uid"] = getCookieOrDefault(req.cookies, "x-hassudev-uid", process.env["x-hassudev-uid"]) as string;
    headers["x-hassudev-roles"] = getCookieOrDefault(req.cookies, "x-hassudev-roles", process.env["x-hassudev-roles"]) as string;
  }
  const accessToken = req.cookies["x-vls-access-token"];
  if (accessToken) {
    headers["x-vls-access-token"] = accessToken;
  }
  const request = new HttpRequest({
    headers: headers,
    hostname: urlObject.hostname,
    method: "POST",
    path: urlObject.pathname,
    body: JSON.stringify(body),
  });
  const { body: responseBody, statusCode } = await sendSignedRequest(request, "appsync");

  res.status(statusCode).json(responseBody);
}

function getCookieOrDefault(cookies: Partial<{ [p: string]: string }>, name: string, defaultValue: string | undefined) {
  let value = cookies?.[name];
  if (value) {
    return value;
  }
  return defaultValue;
}
