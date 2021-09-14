import { Amplify } from "@aws-amplify/core";

import awsExports from "../aws-exports";
import { API, graphqlOperation } from "aws-amplify";
import { GraphQLAPIClass } from "@aws-amplify/api-graphql";
import { isVaylaAuthenticated } from "../services/userService";
import * as model from "./apiModel";
import * as queries from "./queries";
import * as mutations from "./mutations";

import { GraphQLResult } from "@aws-amplify/api-graphql/src/types/index";

Amplify.configure(awsExports);

const yllapitoEndpoint = awsExports.aws_appsync_graphqlEndpoint.replace("/graphql", "/yllapito/graphql");
export const yllapitoAPI = new GraphQLAPIClass({ ...awsExports, aws_appsync_graphqlEndpoint: yllapitoEndpoint });
Amplify.register(yllapitoAPI);
yllapitoAPI.configure({ aws_appsync_graphqlEndpoint: yllapitoEndpoint });

export const callAPI = async (operation: any) => {
  if (isVaylaAuthenticated()) {
    return yllapitoAPI.graphql(operation);
  } else {
    return API.graphql(operation);
  }
};

export async function createSuunnitelma(suunnitelma: model.CreateSuunnitelmaInput) {
  return await callAPI(graphqlOperation(mutations.createSuunnitelma, { suunnitelma }));
}

export async function updateSuunnitelma(suunnitelma: model.UpdateSuunnitelmaInput) {
  return await callAPI(graphqlOperation(mutations.updateSuunnitelma, { suunnitelma }));
}

export async function getVelhoSuunnitelmasByName(suunnitelmaName: string): Promise<model.Suunnitelma[]> {
  const response = (await callAPI(
    graphqlOperation(queries.getVelhoSuunnitelmasByName, { suunnitelmaName })
  )) as GraphQLResult<model.GetVelhoSuunnitelmasByNameQuery>;
  return response.data?.getVelhoSuunnitelmasByName as model.Suunnitelma[];
}

export async function getVelhoSuunnitelmaSuggestionsByName(suunnitelmaName: string): Promise<model.Suunnitelma[]> {
  const response = (await callAPI(
    graphqlOperation(queries.getVelhoSuunnitelmaSuggestionsByName, { suunnitelmaName })
  )) as GraphQLResult<model.GetVelhoSuunnitelmaSuggestionsByNameQuery>;
  return response.data?.getVelhoSuunnitelmaSuggestionsByName as model.Suunnitelma[];
}

export async function listSuunnitelmat() {
  const response = (await callAPI(
    graphqlOperation(queries.listSuunnitelmat)
  )) as GraphQLResult<model.ListSuunnitelmatQuery>;
  return response.data?.listSuunnitelmat as model.Suunnitelma[];
}
