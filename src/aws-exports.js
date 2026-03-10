/* eslint-disable */
import { getPublicEnv } from "./util/env";

const awsmobile = {
  aws_project_region: "eu-west-1",
  aws_appsync_graphqlEndpoint: getPublicEnv("REACT_APP_API_URL") ? getPublicEnv("REACT_APP_API_URL") : "/graphql",
  aws_appsync_region: "eu-west-1",
  aws_appsync_authenticationType: "API_KEY",
  aws_appsync_apiKey: getPublicEnv("REACT_APP_API_KEY"),
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
};

export default awsmobile;
