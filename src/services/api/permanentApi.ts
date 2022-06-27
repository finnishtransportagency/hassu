import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { onError } from "apollo-link-error";
import { API, ERROR_MESSAGE_NOT_AUTHENTICATED } from "@services/api/commonApi";
import { FetchResult } from "apollo-link/lib/types";
import { Observable } from "apollo-link";
import { ServerError } from "apollo-link-http-common";
import { GraphQLError } from "graphql/error/GraphQLError";

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
  onError((errorResponse) => {
    let networkError = errorResponse.networkError as ServerError;
    let response: Response = networkError?.response as unknown as Response;
    if (response?.type === "opaqueredirect") {
      let fetchResult: FetchResult = { errors: [new GraphQLError(ERROR_MESSAGE_NOT_AUTHENTICATED)] };
      return Observable.of(fetchResult);
    }
  }),
  createHttpLink({
    uri: yllapitoGraphQLAPI,
    fetchOptions: { redirect: "manual" },
  }),
];
export const api = new API(publicLinks, authenticatedLinks);
