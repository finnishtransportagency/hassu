/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import { FieldLogLevel, GraphqlApi } from "@aws-cdk/aws-appsync";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { Config } from "./config";

export class HassuBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct) {
    super(scope, "backend", {
      stackName: "hassu-backend-" + Config.env,
      env: {
        region: "eu-west-1",
      },
    });

    const api = this.createAPI();
    const backendLambda = this.createBackendLambda();
    HassuBackendStack.mapApiResolversToLambda(api, backendLambda);
    const suunnitelmatTable = this.createDatabase();
    HassuBackendStack.attachDatabaseToBackend(suunnitelmatTable, backendLambda);

    new cdk.CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
  }

  private createAPI() {
    const apiKeyExpiration = HassuBackendStack.createApiKeyExpiration();
    return new appsync.GraphqlApi(this, "Api", {
      name: "hassu-api",
      schema: appsync.Schema.fromAsset("schema.graphql"),
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: true,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.atDate(apiKeyExpiration),
          },
        },
      },
    });
  }

  /**
   * Create expiration date that doesn't update in every deployment
   * @private
   */
  private static createApiKeyExpiration() {
    const apiKeyExpiration = new Date();
    // Add 365 days
    apiKeyExpiration.setDate(apiKeyExpiration.getDate() + 365);
    // Round down to the first day of month to keep it static in deployments for a month
    apiKeyExpiration.setDate(1);
    apiKeyExpiration.setHours(0, 0, 0, 0);
    return apiKeyExpiration;
  }

  private createBackendLambda() {
    return new NodejsFunction(this, "API", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 128,
      environment: {},
    });
  }

  private static mapApiResolversToLambda(api: GraphqlApi, backendFn: NodejsFunction) {
    const lambdaDataSource = api.addLambdaDataSource("lambdaDatasource", backendFn);

    // Map the resolvers to the Lambda function
    lambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "listSuunnitelmat",
    });
    lambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "getSuunnitelmaById",
    });
    lambdaDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "createSuunnitelma",
    });
    lambdaDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "updateSuunnitelma",
    });
  }

  private createDatabase() {
    return new ddb.Table(this, "HassuSuunnitelmat", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
    });
  }

  private static attachDatabaseToBackend(suunnitelmatTable: ddb.Table, backendFn: NodejsFunction) {
    suunnitelmatTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_SUUNNITELMAT", suunnitelmatTable.tableName);
  }
}
