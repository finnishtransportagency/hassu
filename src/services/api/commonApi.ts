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
  private client: ApolloClient<any>;

  constructor(link: ApolloLink) {
    super();
    this.client = new ApolloClient({
      link,
      cache: new InMemoryCache(),
      defaultOptions,
    });
  }

  async callGraphQL(operation: OperationConfig, variables: any) {
    switch (operation.operationType) {
      case OperationType.Query:
        const queryResponse: ApolloQueryResult<any> = await this.client.query({
          query: gql(operation.graphql),
          variables,
          fetchPolicy: "network-only",
        });
        return queryResponse.data?.[operation.name];
      case OperationType.Mutation:
        const fetchResponse: FetchResult<any> = await this.client.mutate({
          mutation: gql(operation.graphql),
          variables,
        });
        return fetchResponse.data?.[operation.name];
    }
    throw Error("Unknown operation");
  }

  async callAPI(operation: OperationConfig, variables?: any): Promise<any> {
    return await this.callGraphQL(operation, variables);
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any> {
    return await this.callGraphQL(operation, variables);
  }
}
