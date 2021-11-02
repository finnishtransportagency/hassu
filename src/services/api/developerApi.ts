import awsExports from "../../aws-exports";
import { ApolloLink } from "apollo-link";
import { createAuthLink } from "aws-appsync-auth-link";
import { createHttpLink } from "apollo-link-http";
import { API } from "@services/api/commonApi";

const AWS = require("aws-sdk");
AWS.config.update({
  region: awsExports.aws_appsync_region,
  credentials: new AWS.Credentials({
    accessKeyId: awsExports.AWS_ACCESS_KEY_ID,
    secretAccessKey: awsExports.AWS_SECRET_ACCESS_KEY,
    sessionToken: awsExports.AWS_SESSION_TOKEN,
  }),
});
const credentials = AWS.config.credentials;

const link = ApolloLink.from([
  createAuthLink({
    url: awsExports.aws_appsync_graphqlEndpoint,
    region: awsExports.aws_appsync_region,
    auth: { type: "AWS_IAM", credentials },
  }),
  createHttpLink({
    uri: awsExports.aws_appsync_graphqlEndpoint,
    headers: {
      "x-hassudev-uid": process.env["x-hassudev-uid"],
      "x-hassudev-roles": process.env["x-hassudev-roles"],
    },
  }),
]);

export const api = new API(link);
