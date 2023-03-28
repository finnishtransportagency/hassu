import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { ErrorResponse, onError } from "apollo-link-error";
import { API, ERROR_MESSAGE_NOT_AUTHENTICATED } from "@services/api/commonApi";
import { FetchResult } from "apollo-link/lib/types";
import { ApolloLink, Observable } from "apollo-link";
import { ServerError } from "apollo-link-http-common";
import { GraphQLError } from "graphql/error/GraphQLError";

const AWS = require("aws-sdk");
AWS.config.update({
  region: awsExports.aws_appsync_region,
});

export type ErrorResponseHandler = (errorResponse: ErrorResponse) => void;
type GenerateLinkArray = (graphQLAPI: string, errorHandler?: ErrorResponseHandler) => ApolloLink[];

const getPublicLinks: GenerateLinkArray = (graphQLAPI: string, errorHandler) => {
  return [
    createAuthLink({
      url: graphQLAPI,
      region: awsExports.aws_appsync_region,
      auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
    }),
    onError((errorResponse) => {
      if (errorResponse.response?.errors) {
        const isActualErrorPresent = errorResponse?.response?.errors?.some((error) => error.message !== "HASSU_INFO");
        if (isActualErrorPresent) {
          errorHandler?.(errorResponse);
        }
      }
    }),
    createHttpLink({
      uri: graphQLAPI,
    }),
  ];
};

const getAuthenticatedLinks: GenerateLinkArray = (graphQLAPI: string, errorHandler) => {
  const yllapitoGraphQLAPI = graphQLAPI.replace("/graphql", "/yllapito/graphql");
  return [
    createAuthLink({
      url: yllapitoGraphQLAPI,
      region: awsExports.aws_appsync_region,
      auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
    }),
    onError((errorResponse) => {
      let networkError = errorResponse.networkError as ServerError;
      let response: Response = networkError?.response as unknown as Response;
      const isActualErrorPresent = errorResponse?.response?.errors?.some((error) => error.message !== "HASSU_INFO");
      if (isActualErrorPresent) {
        errorHandler?.(errorResponse);
      }
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
};

export const api = new API(
  getPublicLinks(awsExports.aws_appsync_graphqlEndpoint),
  getAuthenticatedLinks(awsExports.aws_appsync_graphqlEndpoint)
);

export const relativeEndpointAPI = new API(getPublicLinks("/graphql"), getAuthenticatedLinks("/graphql"));

export function createApiWithAdditionalErrorHandling(
  publicErrorHandler: (errorResponse: ErrorResponse) => void,
  authenticatedErrorHandler: (errorResponse: ErrorResponse) => void
) {
  return new API(getPublicLinks("/graphql", publicErrorHandler), getAuthenticatedLinks("/graphql", authenticatedErrorHandler));
}
