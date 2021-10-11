import { Amplify } from "@aws-amplify/core";

import awsExports from "../aws-exports";
import { API as AmplifyAPI, graphqlOperation } from "aws-amplify";
import { GraphQLAPIClass } from "@aws-amplify/api-graphql";
import log from "loglevel";

import { GraphQLResult } from "@aws-amplify/api-graphql/src/types/index";
import { AbstractApi, OperationConfig } from "@common/abstractApi";

Amplify.configure(awsExports);

const yllapitoEndpoint = awsExports.aws_appsync_graphqlEndpoint.replace("/graphql", "/yllapito/graphql");
export const yllapitoAPI = new GraphQLAPIClass({ ...awsExports, aws_appsync_graphqlEndpoint: yllapitoEndpoint });
Amplify.register(yllapitoAPI);
yllapitoAPI.configure({ aws_appsync_graphqlEndpoint: yllapitoEndpoint });

const callYllapitoAPI = async (operation: any) => {
  try {
    return yllapitoAPI.graphql(operation);
  } catch (e) {
    log.error(e);
    window.location.pathname = "/yllapito/kirjaudu";
  }
};

class API extends AbstractApi {
  async callAPI(operation: OperationConfig, variables?: any): Promise<any> {
    const response = (await AmplifyAPI.graphql(graphqlOperation(operation.graphql, variables))) as GraphQLResult<any>;
    return response.data?.[operation.name];
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any> {
    const response = (await callYllapitoAPI(graphqlOperation(operation.graphql, variables))) as GraphQLResult<any>;
    return response.data?.[operation.name];
  }
}

export const api = new API();
export * from "@common/graphql/apiModel";
