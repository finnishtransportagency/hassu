// Contains code generated or recommended by Amazon Q
import awsExports from "../../aws-exports";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink, FetchResult, Observable, ServerError, ApolloLink } from "@apollo/client";
import { ErrorResponse, onError } from "@apollo/client/link/error";
import { API, ERROR_MESSAGE_NOT_AUTHENTICATED } from "@services/api/commonApi";
import { GraphQLError } from "graphql/error/GraphQLError";
import fetch from "cross-fetch";

/**
 * Strips basic auth credentials from a URL to prevent them from leaking into GraphQL requests.
 *
 * Problem: In non-production environments, basic auth is used to protect the public site.
 * When a user navigates with credentials in the URL (e.g., https://user:pass@host),
 * the browser sends an Authorization header with all subsequent fetch requests,
 * which conflicts with AppSync API key authentication and causes the public side
 * of the application to enter an infinite loading loop.
 *
 * In production there is no basic auth, so this function acts as a no-op —
 * it simply converts relative paths to absolute URLs using window.location.origin,
 * which never contains credentials.
 */
export const stripCredentialsFromUrl = (relativeOrAbsoluteUrl: string): string => {
  if (typeof window === "undefined") {
    return relativeOrAbsoluteUrl;
  }
  if (relativeOrAbsoluteUrl.startsWith("/")) {
    return window.location.origin + relativeOrAbsoluteUrl;
  }
  try {
    const url = new URL(relativeOrAbsoluteUrl);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return relativeOrAbsoluteUrl;
  }
};

export type ErrorResponseHandler = (errorResponse: ErrorResponse) => void;
type GenerateLinkArray = (graphQLAPI: string, errorHandler?: ErrorResponseHandler) => ApolloLink[];

const getPublicLinks: GenerateLinkArray = (graphQLAPI: string, errorHandler) => {
  return [
    createAuthLink({
      url: stripCredentialsFromUrl(graphQLAPI),
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
      uri: stripCredentialsFromUrl(graphQLAPI),
      fetch,
    }),
  ];
};

const getAuthenticatedLinks: GenerateLinkArray = (graphQLAPI: string, errorHandler) => {
  const yllapitoGraphQLAPI = graphQLAPI.replace("/graphql", "/yllapito/graphql");
  return [
    createAuthLink({
      url: stripCredentialsFromUrl(yllapitoGraphQLAPI),
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
      uri: stripCredentialsFromUrl(yllapitoGraphQLAPI),
      fetchOptions: { redirect: "manual" },
      fetch,
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
