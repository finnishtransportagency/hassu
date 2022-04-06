import type { NextApiRequest, NextApiResponse } from "next";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { HeaderBag } from "@aws-sdk/types";
import { sendSignedRequest } from "../../../backend/src/aws/awsRequest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let body = req.body;
  const urlObject = new URL(process.env.APPSYNC_URL || "");
  const isYllapito = req.query.yllapito == "true";

  let params: URLSearchParams | undefined;
  if (typeof window !== "undefined") {
    params = window.location?.search ? new URLSearchParams(window.location.search) : undefined;
  }
  let headers = {
    host: urlObject.host,
  } as unknown as HeaderBag;
  if (isYllapito) {
    headers["x-hassudev-uid"] = getParamOrDefault(params, "x-hassudev-uid", process.env["x-hassudev-uid"]) as string;
    headers["x-hassudev-roles"] = getParamOrDefault(
      params,
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

  res.status(statusCode).json(JSON.stringify(responseBody));
}

function storeValue(name: string, value: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(name, value);
  }
}

function getValue(name: string) {
  if (typeof window !== "undefined") {
    return localStorage.getItem(name);
  }
}

function getParamOrDefault(params: URLSearchParams | undefined, name: string, defaultValue: string | undefined) {
  if (params) {
    if (params.has(name)) {
      const value = params.get(name) || "";
      storeValue(name, value);
      return value;
    }
  }
  const valueFromStorage = getValue(name);
  if (!!valueFromStorage) {
    return valueFromStorage;
  }
  return defaultValue;
}
