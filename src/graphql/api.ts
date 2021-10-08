import { Amplify } from "@aws-amplify/core";

import awsExports from "../aws-exports";
import { API, graphqlOperation } from "aws-amplify";
import { GraphQLAPIClass } from "@aws-amplify/api-graphql";
import * as model from "./apiModel";
import {
  LataaProjektiQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  TallennaProjektiMutationVariables,
} from "./apiModel";
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

export async function lataaProjekti(oid: string): Promise<model.Projekti> {
  const response = (await callYllapitoAPI(
    graphqlOperation(queries.lataaProjekti, { oid } as LataaProjektiQueryVariables)
  )) as GraphQLResult<model.LataaProjektiQuery>;
  return response.data?.lataaProjekti as model.Projekti;
}

export async function tallennaProjekti(projekti: model.TallennaProjektiInput) {
  return await callYllapitoAPI(
    graphqlOperation(mutations.tallennaProjekti, { projekti } as TallennaProjektiMutationVariables)
  );
}

export async function getVelhoSuunnitelmasByName(
  nimi: string,
  requireExactMatch?: boolean
): Promise<model.VelhoHakuTulos[]> {
  const response = (await callYllapitoAPI(
    graphqlOperation(queries.listaaVelhoProjektit, {
      nimi,
      requireExactMatch,
    } as ListaaVelhoProjektitQueryVariables)
  )) as GraphQLResult<model.ListaaVelhoProjektitQuery>;
  return response.data?.listaaVelhoProjektit as model.VelhoHakuTulos[];
}

export async function listProjektit() {
  const response = (await API.graphql(
    graphqlOperation(queries.listaaProjektit)
  )) as GraphQLResult<model.ListaaProjektitQuery>;
  return response.data?.listaaProjektit as model.Projekti[];
}

export async function getCurrentUser(): Promise<model.Kayttaja | undefined> {
  try {
    const response = (await callYllapitoAPI(
      graphqlOperation(queries.nykyinenKayttaja)
    )) as GraphQLResult<model.NykyinenKayttajaQuery>;
    return response.data?.nykyinenKayttaja as model.Kayttaja;
  } catch (e) {
    log.error(e);
  }
}
