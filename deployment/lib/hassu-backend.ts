/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import { FieldLogLevel } from "@aws-cdk/aws-appsync";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { config } from "./config";

export class HassuBackendStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: cdk.Construct) {
    super(scope, "backend", { stackName: "hassu-backend-" + config.env });
    // Create the AppSync API
    this.api = new appsync.GraphqlApi(this, "Api", {
      name: "hassu-api",
      schema: appsync.Schema.fromAsset("schema.graphql"),
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: false,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
    });

    // Create the Lambda function that will map GraphQL operations into Postgres
    const backendFn = new NodejsFunction(this, "API", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 128,
      environment: {},
      // bundling: {
      //   minify: true,
      //   tsconfig: `${__dirname}/../backend/tsconfig.json` // optional if you want to override defaults
      // }
    });

    const lambdaDs = this.api.addLambdaDataSource("lambdaDatasource", backendFn);

    // Map the resolvers to the Lambda function
    lambdaDs.createResolver({
      typeName: "Query",
      fieldName: "listSuunnitelmat",
    });
    lambdaDs.createResolver({
      typeName: "Query",
      fieldName: "getSuunnitelmaById",
    });
    lambdaDs.createResolver({
      typeName: "Mutation",
      fieldName: "createSuunnitelma",
    });
    lambdaDs.createResolver({
      typeName: "Mutation",
      fieldName: "updateSuunnitelma",
    });

    // create DynamoDB table
    const suunnitelmatTable = new ddb.Table(this, "HassuSuunnitelmat", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
    });

    suunnitelmatTable.grantFullAccess(backendFn);

    backendFn.addEnvironment("TABLE_SUUNNITELMAT", suunnitelmatTable.tableName);
  }
}
