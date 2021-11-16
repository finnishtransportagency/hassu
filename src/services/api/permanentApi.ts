import awsExports from "../../aws-exports";
import { ApolloLink } from "apollo-link";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";

let host: string = "";
if (typeof window !== "undefined") {
  host = "https://" + window.location.hostname;
}

const publicLink = ApolloLink.from([
  createAuthLink({
    url: host + "/graphql",
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: host + "/graphql",
  }),
]);

const authenticatedLink = ApolloLink.from([
  createAuthLink({
    url: host + "/yllapito/graphql",
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: host + "/yllapito/graphql",
  }),
]);

export const api = new API(publicLink, authenticatedLink);
