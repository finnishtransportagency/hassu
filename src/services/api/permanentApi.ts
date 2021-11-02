import awsExports from "../../aws-exports";
import { ApolloLink } from "apollo-link";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";

const publicLink = ApolloLink.from([
  createAuthLink({
    url: "/graphql",
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: "/graphql",
  }),
]);

const authenticatedLink = ApolloLink.from([
  createAuthLink({
    url: "/yllapito/graphql",
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: "/yllapito/graphql",
  }),
]);

export const api = new API(publicLink, authenticatedLink);
