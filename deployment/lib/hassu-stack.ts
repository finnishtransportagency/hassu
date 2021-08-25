/* tslint:disable:no-unused-expression */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as appsync from '@aws-cdk/aws-appsync';
import {FieldLogLevel} from '@aws-cdk/aws-appsync';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import * as ddb from '@aws-cdk/aws-dynamodb';

export class HassuStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the AppSync API
    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'hassu-api',
      schema: appsync.Schema.fromAsset('schema.graphql'),
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: true,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365))
          }
        },
      },
    });

    // Create the Lambda function that will map GraphQL operations into Postgres
    const backendFn = new NodejsFunction(this, 'API', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: 'handleEvent',
      memorySize: 128,
      environment: {},
      // bundling: {
      //   minify: true,
      //   tsconfig: `${__dirname}/../backend/tsconfig.json` // optional if you want to override defaults
      // }
    });

    const lambdaDs = api.addLambdaDataSource('lambdaDatasource', backendFn);

    // Map the resolvers to the Lambda function
    lambdaDs.createResolver({
      typeName: 'Query',
      fieldName: 'listSuunnitelmat'
    });
    lambdaDs.createResolver({
      typeName: 'Query',
      fieldName: 'getSuunnitelmaById'
    });
    lambdaDs.createResolver({
      typeName: 'Mutation',
      fieldName: 'createSuunnitelma'
    });
    lambdaDs.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateSuunnitelma'
    });

    // create DynamoDB table
    const suunnitelmatTable = new ddb.Table(this, 'HassuSuunnitelmat', {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
    });

    // enable the Lambda function to access the DynamoDB table (using IAM)
    suunnitelmatTable.grantFullAccess(backendFn)

    backendFn.addEnvironment('TABLE_SUUNNITELMAT', suunnitelmatTable.tableName);

    // CFN Outputs
    new cdk.CfnOutput(this, 'AppSyncAPIURL', {
      value: api.graphqlUrl
    });
    new cdk.CfnOutput(this, 'AppSyncAPIKey', {
      value: api.apiKey || ''
    });
  }
}
