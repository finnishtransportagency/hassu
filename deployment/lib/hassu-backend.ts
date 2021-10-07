/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Duration } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import { FieldLogLevel, GraphqlApi } from "@aws-cdk/aws-appsync";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { Config } from "./config";
import { createDatabase } from "./hassu-database";

export class HassuBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct) {
    super(scope, "backend", {
      stackName: "hassu-backend-" + Config.env,
      env: {
        region: "eu-west-1",
      },
    });
  }

  async process() {
    const config = await Config.instance(this);
    const api = this.createAPI();
    const backendLambda = await this.createBackendLambda(config);
    HassuBackendStack.mapApiResolversToLambda(api, backendLambda);
    const projektiTable = createDatabase(this);
    HassuBackendStack.attachDatabaseToBackend(projektiTable, backendLambda);

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

  private async createBackendLambda(config: Config) {
    return new NodejsFunction(this, "API", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 128,
      timeout: Duration.seconds(29),
      environment: {
        COGNITO_URL: config.getInfraParameter("CognitoURL"),
        VELHO_AUTH_URL: config.getInfraParameter("VelhoAuthenticationUrl"),
        VELHO_API_URL: config.getInfraParameter("VelhoApiUrl"),
        VELHO_USERNAME: await config.getSecureInfraParameter("VelhoUsername"),
        VELHO_PASSWORD: await config.getSecureInfraParameter("VelhoPassword"),

        PERSON_SEARCH_API_URL: config.getInfraParameter("PersonSearchApiURL"),
        PERSON_SEARCH_API_USERNAME: config.getInfraParameter("PersonSearchApiUsername"),
        PERSON_SEARCH_API_PASSWORD: config.getInfraParameter("PersonSearchApiPassword"),
      },
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
      typeName: "Query",
      fieldName: "getCurrentUser",
    });
    lambdaDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "createSuunnitelma",
    });
    lambdaDataSource.createResolver({
      typeName: "Mutation",
      fieldName: "updateSuunnitelma",
    });
    lambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "getVelhoSuunnitelmasByName",
    });
    lambdaDataSource.createResolver({
      typeName: "Query",
      fieldName: "listAllUsers",
    });
  }

  private static attachDatabaseToBackend(projektiTable: ddb.Table, backendFn: NodejsFunction) {
    projektiTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_PROJEKTI", projektiTable.tableName);
  }
}
