/* eslint-disable */

const awsmobile = {
    "aws_project_region": "eu-west-1",
    "aws_appsync_graphqlEndpoint": process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : "/graphql",
    "aws_appsync_region": "eu-west-1",
    "aws_appsync_authenticationType": "API_KEY",
    "aws_appsync_apiKey": process.env.REACT_APP_API_KEY
};


export default awsmobile;
