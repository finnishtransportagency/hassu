import { Amplify } from "@aws-amplify/core";

import awsExports from "../aws-exports";
import { API } from "aws-amplify";
import { GraphQLAPIClass } from "@aws-amplify/api-graphql";
import { isVaylaAuthenticated } from "../services/userService";

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
