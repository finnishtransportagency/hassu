import { Amplify } from "@aws-amplify/core";

import awsExports from "../aws-exports";
import { API, graphqlOperation } from "aws-amplify";
import { GraphQLAPIClass } from "@aws-amplify/api-graphql";
import * as model from "./apiModel";
import * as queries from "./queries";
import * as mutations from "./mutations";
import log from "loglevel";

import { GraphQLResult } from "@aws-amplify/api-graphql/src/types/index";

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

export async function getSuunnitelmaById(suunnitelmaId: string) {
  const response = (await callYllapitoAPI(
    graphqlOperation(queries.getSuunnitelmaById, { suunnitelmaId })
  )) as GraphQLResult<model.GetSuunnitelmaByIdQuery>;
  return response.data?.getSuunnitelmaById as model.Suunnitelma;
}

export async function createSuunnitelma(suunnitelma: model.CreateSuunnitelmaInput) {
  return await callYllapitoAPI(graphqlOperation(mutations.createSuunnitelma, { suunnitelma }));
}

export async function updateSuunnitelma(suunnitelma: model.UpdateSuunnitelmaInput) {
  return await callYllapitoAPI(graphqlOperation(mutations.updateSuunnitelma, { suunnitelma }));
}

export async function getVelhoSuunnitelmasByName(
  suunnitelmaName: string,
  requireExactMatch?: boolean
): Promise<model.VelhoHakuTulos[]> {
  const response = (await callYllapitoAPI(
    graphqlOperation(queries.getVelhoSuunnitelmasByName, { suunnitelmaName, requireExactMatch })
  )) as GraphQLResult<model.GetVelhoSuunnitelmasByNameQuery>;
  return response.data?.getVelhoSuunnitelmasByName as model.VelhoHakuTulos[];
}

export async function listSuunnitelmat() {
  const response = (await API.graphql(
    graphqlOperation(queries.listSuunnitelmat)
  )) as GraphQLResult<model.ListSuunnitelmatQuery>;
  return response.data?.listSuunnitelmat as model.Suunnitelma[];
}

export async function getCurrentUser(): Promise<model.User | undefined> {
  try {
    const response = (await callYllapitoAPI(
      graphqlOperation(queries.getCurrentUser)
    )) as GraphQLResult<model.GetCurrentUserQuery>;
    return response.data?.getCurrentUser as model.User;
  } catch (e) {
    log.debug(e);
  }
}
