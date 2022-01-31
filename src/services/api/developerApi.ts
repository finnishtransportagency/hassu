import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";
import { setContext } from "apollo-link-context";

const AWS = require("aws-sdk");
AWS.config.update({
  region: awsExports.aws_appsync_region,
});

if (typeof window !== "undefined") {
  AWS.config.update({
    credentials: new AWS.Credentials({
      accessKeyId: awsExports.AWS_ACCESS_KEY_ID,
      secretAccessKey: awsExports.AWS_SECRET_ACCESS_KEY,
      sessionToken: awsExports.AWS_SESSION_TOKEN,
    }),
  });
}

function getParamOrDefault(params: URLSearchParams | undefined, name: string, defaultValue: string | undefined) {
  if (params) {
    if (params.has(name)) {
      const value = params.get(name) || "";
      localStorage.setItem(name, value);
      return value;
    }
  }
  const valueFromStorage = localStorage.getItem(name);
  if (!!valueFromStorage) {
    return valueFromStorage;
  }
  return defaultValue;
}

const links = [
  setContext((_, { headers }) => {
    if (typeof window !== "undefined") {
      const params = window.location?.search ? new URLSearchParams(window.location.search) : undefined;
      return {
        headers: {
          ...headers,
          "x-hassudev-uid": getParamOrDefault(params, "x-hassudev-uid", process.env["x-hassudev-uid"]),
          "x-hassudev-roles": getParamOrDefault(params, "x-hassudev-roles", process.env["x-hassudev-roles"]),
        },
      };
    }
  }),
  createAuthLink({
    url: awsExports.aws_appsync_graphqlEndpoint,
    region: awsExports.aws_appsync_region,
    auth: { type: "AWS_IAM", credentials: AWS.config.credentials },
  }),
  createHttpLink({
    uri: awsExports.aws_appsync_graphqlEndpoint,
  }),
];

export const api = new API(links, links, false);
