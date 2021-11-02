import awsExports from "../../aws-exports";
import { ApolloLink } from "apollo-link";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";

const link = ApolloLink.from([
  createAuthLink({
    url: awsExports.aws_appsync_graphqlEndpoint,
    region: awsExports.aws_appsync_region,
    auth: { type: "API_KEY", apiKey: awsExports.aws_appsync_apiKey || "" },
  }),
  createHttpLink({
    uri: awsExports.aws_appsync_graphqlEndpoint,
  }),
]);

export const api = new API(link);
