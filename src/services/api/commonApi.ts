import { AbstractApi, OperationConfig, OperationType } from "../../../common/abstractApi";
import {
  DefaultOptions,
  ApolloQueryResult,
  ApolloLink,
  FetchResult,
  GraphQLRequest,
  ApolloClient,
  InMemoryCache,
  gql,
} from "@apollo/client";
import log from "loglevel";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
export const ERROR_MESSAGE_NOT_AUTHENTICATED = "NOT_AUTHENTICATED";

import possibleTypes from "./fragmentTypes.json";

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: "no-cache",
    errorPolicy: "ignore",
  },
  query: {
    fetchPolicy: "no-cache",
    errorPolicy: "all",
  },
};

export class API extends AbstractApi {
  private readonly publicClient: ApolloClient<any>;
  private readonly authenticatedClient: ApolloClient<any>;

  constructor(publicLinks: ApolloLink[], authenticatedLinks: ApolloLink[], enableOneTimeHeaders: boolean = true) {
    super();

    const headerForwarderLink = setContext((_operation: GraphQLRequest, prevContext: Record<string, any>) => {
      if (this.oneTimeHeaders && enableOneTimeHeaders) {
        // This code is required to pass both signed cookie and basic authentication from incoming request to API in src/pages/api/projekti/[oid]/aloituskuulutus/pdf.ts
        const newHeaders = { headers: { ...prevContext.headers, ...this.oneTimeHeaders } };
        // Delete the headers so that they are used only once
        this.oneTimeHeaders = undefined;
        return newHeaders;
      }
      return prevContext;
    });

    publicLinks.unshift(headerForwarderLink);
    authenticatedLinks.unshift(headerForwarderLink);

    // If the correlationId is the only "error", remove it from the response so that it won't be thrown
    const errorLink = onError((errorResponse) => {
      if (
        errorResponse.graphQLErrors &&
        errorResponse.graphQLErrors.length === 1 &&
        errorResponse.graphQLErrors[0].message === "HASSU_INFO" &&
        errorResponse.response?.errors
      ) {
        delete errorResponse.response.errors;
      }
    });

    publicLinks.unshift(errorLink);
    authenticatedLinks.unshift(errorLink);

    this.publicClient = new ApolloClient({
      link: ApolloLink.from(publicLinks),
      cache: new InMemoryCache({
        possibleTypes,
        dataIdFromObject: () => undefined, // Ilman tätä tietorakenteessa cachetetaan kaikki elementit joissa on sama id samoiksi objekteiksi, eli data korruptoituu
      }),
      defaultOptions,
    });
    this.authenticatedClient = new ApolloClient({
      link: ApolloLink.from(authenticatedLinks),
      cache: new InMemoryCache({
        possibleTypes,
        dataIdFromObject: () => undefined, // Ilman tätä tietorakenteessa cachetetaan kaikki elementit joissa on sama id samoiksi objekteiksi, eli data korruptoituu
      }),
      defaultOptions,
    });
  }

  async callGraphQL(client: ApolloClient<any>, operation: OperationConfig, variables: any) {
    switch (operation.operationType) {
      case OperationType.Query:
        const queryResponse: ApolloQueryResult<any> = await client.query({
          query: gql(operation.graphql),
          variables,
          fetchPolicy: "network-only",
          errorPolicy: "all",
        });
        const data = queryResponse.data?.[operation.name];
        if (queryResponse.errors) {
          for (const error of queryResponse.errors) {
            if (error.message === ERROR_MESSAGE_NOT_AUTHENTICATED) {
              window.location.assign("/yllapito/kirjaudu");
              throw new Error(ERROR_MESSAGE_NOT_AUTHENTICATED);
            }
          }
          log.warn(queryResponse.errors);
          throw new Error("API palautti virheen: " + queryResponse.errors.at(0)?.message);
        }
        return data;
      case OperationType.Mutation:
        const fetchResponse: FetchResult<any> = await client.mutate({
          mutation: gql(operation.graphql),
          variables,
        });
        return fetchResponse.data?.[operation.name];
    }
    throw Error("Unknown operation");
  }

  async callAPI(operation: OperationConfig, variables?: any): Promise<any> {
    return await this.callGraphQL(this.publicClient, operation, variables);
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any> {
    return await this.callGraphQL(this.authenticatedClient, operation, variables);
  }
}
