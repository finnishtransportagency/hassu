import type { NextApiRequest, NextApiResponse } from "next";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { HeaderBag } from "@aws-sdk/types";
import { sendSignedRequest } from "../../../backend/src/aws/awsRequest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let body = req.body;
  const urlObject = new URL(process.env.APPSYNC_URL || "");
  const isYllapito = req.query.yllapito == "true";

  let headers = {
    host: urlObject.host,
  } as unknown as HeaderBag;
  if (isYllapito) {
    headers["x-hassudev-uid"] = getCookieOrDefault(
      req.cookies,
      "x-hassudev-uid",
      process.env["x-hassudev-uid"]
    ) as string;
    headers["x-hassudev-roles"] = getCookieOrDefault(
      req.cookies,
      "x-hassudev-roles",
      process.env["x-hassudev-roles"]
    ) as string;
  }
  const request = new HttpRequest({
    headers: headers,
    hostname: urlObject.hostname,
    method: "POST",
    path: urlObject.pathname,
    body: JSON.stringify(body),
  });
  const { body: responseBody, statusCode } = await sendSignedRequest(request, "appsync");

  if (statusCode === 302) {
    res.redirect(302, "/yllapito/kirjaudu");
    return;
  }

  res.status(statusCode).json(JSON.stringify(responseBody));
}

function getCookieOrDefault(cookies: { [p: string]: string }, name: string, defaultValue: string | undefined) {
  let value = cookies?.[name];
  if (value) {
    return value;
  }
  return defaultValue;
}
