import { AbstractApi, OperationConfig, OperationType } from "../../../common/abstractApi";
import { ApolloQueryResult } from "apollo-client/core/types";
import { ApolloLink, FetchResult } from "apollo-link";
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

  constructor(publicLink: ApolloLink, authenticatedLink: ApolloLink) {
    super();
    this.publicClient = new ApolloClient({
      link: publicLink,
      cache: new InMemoryCache(),
      defaultOptions,
    });
    this.authenticatedClient = new ApolloClient({
      link: authenticatedLink,
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
