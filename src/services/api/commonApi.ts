import { AbstractApi, OperationConfig, OperationType } from "../../../common/abstractApi";
import { ApolloQueryResult } from "apollo-client/core/types";
import { ApolloLink, FetchResult, GraphQLRequest } from "apollo-link";
import { setContext } from "apollo-link-context";
import gql from "graphql-tag";
import ApolloClient, { DefaultOptions } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";

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
  private publicClient: ApolloClient<any>;
  private authenticatedClient: ApolloClient<any>;

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

    this.publicClient = new ApolloClient({
      link: ApolloLink.from(publicLinks),
      cache: new InMemoryCache(),
      defaultOptions,
    });
    this.authenticatedClient = new ApolloClient({
      link: ApolloLink.from(authenticatedLinks),
      cache: new InMemoryCache(),
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
        });
        return queryResponse.data?.[operation.name];
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
