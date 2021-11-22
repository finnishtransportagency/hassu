/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Duration, Fn } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { Tracing } from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import { FieldLogLevel, GraphqlApi } from "@aws-cdk/aws-appsync";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { Config } from "./config";
import { apiConfig, OperationType } from "../../common/abstractApi";
import { WafConfig } from "./wafConfig";
import { AuthorizationMode } from "@aws-cdk/aws-appsync/lib/graphqlapi";

export class HassuBackendStack extends cdk.Stack {
  private projektiTable: ddb.Table;

  constructor(scope: Construct, projektiTable: ddb.Table) {
    super(scope, "backend", {
      stackName: "hassu-backend-" + Config.env,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
    this.projektiTable = projektiTable;
  }

  async process() {
    const config = await Config.instance(this);
    const api = this.createAPI(config);
    const backendLambda = await this.createBackendLambda(config);
    this.attachDatabaseToBackend(backendLambda);
    HassuBackendStack.mapApiResolversToLambda(api, backendLambda);

    new cdk.CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
    if (config.isDeveloperEnvironment()) {
      new cdk.CfnOutput(this, "AppSyncAPIURL", {
        value: api.graphqlUrl || "",
      });
    }
  }

  private createAPI(config: Config) {
    let defaultAuthorization: AuthorizationMode;
    if (config.isDeveloperEnvironment()) {
      defaultAuthorization = {
        authorizationType: appsync.AuthorizationType.IAM,
      };
    } else {
      const apiKeyExpiration = HassuBackendStack.createApiKeyExpiration();
      defaultAuthorization = {
        authorizationType: appsync.AuthorizationType.API_KEY,
        apiKeyConfig: {
          expires: cdk.Expiration.atDate(apiKeyExpiration),
        },
      };
    }

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "hassu-api-" + Config.env,
      schema: appsync.Schema.fromAsset("schema.graphql"),
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        excludeVerboseContent: true,
      },
      authorizationConfig: { defaultAuthorization },
      xrayEnabled: true,
    });
    if (!config.isDeveloperEnvironment()) {
      new WafConfig(this, "Hassu-WAF", {
        api,
        allowedAddresses: Fn.split("\n", config.getInfraParameter("WAFAllowedAddresses")),
      });
    }
    return api;
  }

  /**
   * Create expiration date that doesn't update in every deployment
   * @private
   */
  private static createApiKeyExpiration() {
    const apiKeyExpiration = new Date();
    //   Add 365 days
    apiKeyExpiration.setDate(apiKeyExpiration.getDate() + 365);
    // Round down to the first day of month to keep it static in deployments for a month
    apiKeyExpiration.setDate(1);
    apiKeyExpiration.setHours(0, 0, 0, 0);
    return apiKeyExpiration;
  }

  private async createBackendLambda(config: Config) {
    let define;
    if (config.isDeveloperEnvironment()) {
      define = {
        // Replace strings during build time
        "process.env.USER_IDENTIFIER_FUNCTIONS": JSON.stringify("../../developer/identifyIAMUser"),
      };
    }
    return new NodejsFunction(this, "API", {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 256,
      timeout: Duration.seconds(29),
      bundling: {
        define,
        nodeModules: ["pdfkit"],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `./node_modules/.bin/copyfiles -f -u 1 ${inputDir}/backend/src/service/kuulutus/files/* ${outputDir}/files`,
            ];
          },
          afterBundling(): string[] {
            return [];
          },
          beforeInstall() {
            return [];
          },
        },
      },
      environment: {
        COGNITO_URL: config.getInfraParameter("CognitoURL"),
        VELHO_AUTH_URL: config.getInfraParameter("VelhoAuthenticationUrl", config.velhoEnv),
        VELHO_API_URL: config.getInfraParameter("VelhoApiUrl", config.velhoEnv),
        VELHO_USERNAME: await config.getSecureInfraParameter("VelhoUsername", config.velhoEnv),
        VELHO_PASSWORD: await config.getSecureInfraParameter("VelhoPassword", config.velhoEnv),

        PERSON_SEARCH_API_URL: config.getInfraParameter("PersonSearchApiURL"),
        PERSON_SEARCH_API_USERNAME: config.getInfraParameter("PersonSearchApiUsername"),
        PERSON_SEARCH_API_PASSWORD: config.getInfraParameter("PersonSearchApiPassword"),
        PERSON_SEARCH_API_ACCOUNT_TYPES: config.getInfraParameter("PersonSearchApiAccountTypes"),
      },
      tracing: Tracing.ACTIVE,
    });
  }

  private static mapApiResolversToLambda(api: GraphqlApi, backendFn: NodejsFunction) {
    const lambdaDataSource = api.addLambdaDataSource("lambdaDatasource", backendFn);

    for (const operationName in apiConfig) {
      if (apiConfig.hasOwnProperty(operationName)) {
        const operation = (apiConfig as any)[operationName];
        lambdaDataSource.createResolver({
          typeName: operation.operationType === OperationType.Query ? "Query" : "Mutation",
          fieldName: operation.name,
        });
      }
    }
  }

  private attachDatabaseToBackend(backendFn: NodejsFunction) {
    this.projektiTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_PROJEKTI", this.projektiTable.tableName);
  }
}
