import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "./commonApi";
import { setContext } from "apollo-link-context";
import fetch from "node-fetch";

const AWS = require("aws-sdk");
if (awsExports.aws_appsync_region) {
  AWS.config.update({
    region: awsExports.aws_appsync_region,
  });
}

if (typeof window !== "undefined" && awsExports.AWS_ACCESS_KEY_ID) {
  AWS.config.update({
    credentials: new AWS.Credentials({
      accessKeyId: awsExports.AWS_ACCESS_KEY_ID,
      secretAccessKey: awsExports.AWS_SECRET_ACCESS_KEY,
      sessionToken: awsExports.AWS_SESSION_TOKEN,
    }),
  });
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

const authenticatedVaylaUser = setContext((_, { headers }) => {
  let params: URLSearchParams | undefined;
  if (typeof window !== "undefined") {
    params = window.location?.search ? new URLSearchParams(window.location.search) : undefined;
  }
  return {
    headers: {
      ...headers,
      "x-hassudev-uid": getParamOrDefault(params, "x-hassudev-uid", process.env["x-hassudev-uid"]),
      "x-hassudev-roles": getParamOrDefault(params, "x-hassudev-roles", process.env["x-hassudev-roles"]),
    },
  };
});
const links = [
  createAuthLink({
    url: awsExports.aws_appsync_graphqlEndpoint,
    region: awsExports.aws_appsync_region,
    auth: { type: "AWS_IAM", credentials: AWS.config.credentials },
  }),
  createHttpLink({
    uri: awsExports.aws_appsync_graphqlEndpoint,
    fetch: fetch as any,
  }),
];

export const api = new API(links, [authenticatedVaylaUser].concat(links), false);
