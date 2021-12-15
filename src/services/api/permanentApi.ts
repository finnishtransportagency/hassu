import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";

const AWS = require("aws-sdk");
AWS.config.update({
  region: awsExports.aws_appsync_region,
});

const graphQLAPI = awsExports.aws_appsync_graphqlEndpoint;
const yllapitoGraphQLAPI = graphQLAPI.replace("/graphql", "/yllapito/graphql");

const publicLinks = [
  createAuthLink({
    url: graphQLAPI,
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: graphQLAPI,
  }),
];

const authenticatedLinks = [
  createAuthLink({
    url: yllapitoGraphQLAPI,
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: yllapitoGraphQLAPI,
  }),
];
export const api = new API(publicLinks, authenticatedLinks);
