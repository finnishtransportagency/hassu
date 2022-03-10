/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Duration, Fn } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { StartingPosition, Tracing } from "@aws-cdk/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync";
import { FieldLogLevel, GraphqlApi } from "@aws-cdk/aws-appsync";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { Table } from "@aws-cdk/aws-dynamodb";
import { Config } from "./config";
import { apiConfig, OperationType } from "../../common/abstractApi";
import { WafConfig } from "./wafConfig";
import { AuthorizationMode } from "@aws-cdk/aws-appsync/lib/graphqlapi";
import { DynamoEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Domain } from "@aws-cdk/aws-opensearchservice";
import { OpenSearchAccessPolicy } from "@aws-cdk/aws-opensearchservice/lib/opensearch-access-policy";
import { Effect, ManagedPolicy, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket } from "@aws-cdk/aws-s3";
import { getEnvironmentVariablesFromSSM } from "../bin/setupEnvironment";
import { LambdaInsightsVersion } from "@aws-cdk/aws-lambda/lib/lambda-insights";

export type HassuBackendStackProps = {
  searchDomain: Domain;
  projektiTable: Table;
  projektiArchiveTable: Table;
  uploadBucket: Bucket;
  yllapitoBucket: Bucket;
  internalBucket: Bucket;
  archiveBucket: Bucket;
  publicBucket: Bucket;
};

// These should correspond to CfnOutputs produced by this stack
export type BackendStackOutputs = {
  AppSyncAPIKey?: string;
  AppSyncAPIURL: string;
};

export class HassuBackendStack extends cdk.Stack {
  private readonly props: HassuBackendStackProps;

  constructor(scope: Construct, props: HassuBackendStackProps) {
    super(scope, "backend", {
      stackName: "hassu-backend-" + Config.env,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
    this.props = props;
  }

  async process() {
    const config = await Config.instance(this);

    const projektiSearchIndexer = this.createProjektiSearchIndexer();

    const api = this.createAPI(config);
    const commonEnvironmentVariables = await this.getCommonEnvironmentVariables(config);
    const personSearchUpdaterLambda = await this.createPersonSearchUpdaterLambda(commonEnvironmentVariables);
    const backendLambda = await this.createBackendLambda(commonEnvironmentVariables, personSearchUpdaterLambda);
    this.attachDatabaseToBackend(backendLambda);
    HassuBackendStack.mapApiResolversToLambda(api, backendLambda);
    this.configureOpenSearchAccess(projektiSearchIndexer, backendLambda);

    new cdk.CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
    if (Config.isDeveloperEnvironment()) {
      new cdk.CfnOutput(this, "AppSyncAPIURL", {
        value: api.graphqlUrl || "",
      });
    }
  }

  private configureOpenSearchAccess(projektiSearchIndexer: NodejsFunction, backendLambda: NodejsFunction) {
    // Grant write access to the app-search index
    const searchDomain = this.props.searchDomain;
    searchDomain.grantIndexWrite(Config.searchIndex, projektiSearchIndexer);
    searchDomain.grantIndexReadWrite(Config.searchIndex, backendLambda);

    new OpenSearchAccessPolicy(this, "OpenSearchAccessPolicy", {
      domainName: searchDomain.domainName,
      domainArn: searchDomain.domainArn,
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["es:ESHttpGet", "es:ESHttpPut", "es:ESHttpPost"],
          principals: [projektiSearchIndexer.grantPrincipal, backendLambda.grantPrincipal],
          resources: [searchDomain.domainArn],
        }),
      ],
    });
  }

  private createAPI(config: Config) {
    let defaultAuthorization: AuthorizationMode;
    if (Config.isDeveloperEnvironment()) {
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
    if (!Config.isDeveloperEnvironment()) {
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

  private createProjektiSearchIndexer() {
    const streamHandler = new NodejsFunction(this, "DynamoDBStreamHandler", {
      functionName: "hassu-dynamodb-stream-handler-" + Config.env,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/projektiSearch/dynamoDBStreamHandler.ts`,
      handler: "handleDynamoDBEvents",
      memorySize: 256,
      environment: {
        SEARCH_DOMAIN: this.props.searchDomain.domainEndpoint,
      },
      timeout: Duration.seconds(29),
      tracing: Tracing.ACTIVE,
    });

    streamHandler.addEventSource(
      new DynamoEventSource(this.props.projektiTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 5,
        bisectBatchOnError: true,
        retryAttempts: 5,
        maxBatchingWindow: Duration.seconds(1),
      })
    );
    return streamHandler;
  }

  private async createBackendLambda(
    commonEnvironmentVariables: Record<string, string>,
    personSearchUpdaterLambda: NodejsFunction
  ) {
    let define;
    if (Config.isDeveloperEnvironment()) {
      define = {
        // Replace strings during build time
        "process.env.USER_IDENTIFIER_FUNCTIONS": JSON.stringify("../../developer/identifyIAMUser"),
      };
    }

    const backendLambda = new NodejsFunction(this, "API", {
      functionName: "hassu-backend-" + Config.env,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 512,
      timeout: Duration.seconds(29),
      bundling: {
        define,
        minify: true,
        nodeModules: ["pdfkit"],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `./node_modules/.bin/copyfiles -f -u 1 ${inputDir}/backend/src/asiakirja/files/* ${outputDir}/files`,
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
        ...commonEnvironmentVariables,
        PERSON_SEARCH_UPDATER_LAMBDA_ARN: personSearchUpdaterLambda.functionArn,
      },
      tracing: Tracing.PASS_THROUGH,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_98_0,
    });
    backendLambda.addToRolePolicy(
      new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter"], resources: ["*"] })
    );
    backendLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [personSearchUpdaterLambda.functionArn],
      })
    );
    backendLambda.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLambdaInsightsExecutionRolePolicy")
    );

    this.props.uploadBucket.grantPut(backendLambda);
    this.props.uploadBucket.grantReadWrite(backendLambda);
    this.props.yllapitoBucket.grantReadWrite(backendLambda);
    this.props.internalBucket.grantReadWrite(backendLambda);
    this.props.publicBucket.grantReadWrite(backendLambda);
    return backendLambda;
  }

  private async createPersonSearchUpdaterLambda(commonEnvironmentVariables: Record<string, string>) {
    const personSearchLambda = new NodejsFunction(this, "PersonSearchUpdaterLambda", {
      functionName: "hassu-personsearchupdater-" + Config.env,
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: `${__dirname}/../../backend/src/personSearch/lambda/personSearchUpdaterHandler.ts`,
      handler: "handleEvent",
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(120),
      bundling: {
        minify: true,
      },
      environment: {
        ...commonEnvironmentVariables,
      },
      tracing: Tracing.PASS_THROUGH,
    });
    this.props.internalBucket.grantReadWrite(personSearchLambda);
    return personSearchLambda;
  }

  private static mapApiResolversToLambda(api: GraphqlApi, backendFn: NodejsFunction) {
    const lambdaDataSource = api.addLambdaDataSource("lambdaDatasource", backendFn);

    for (const operationName in apiConfig) {
      if (apiConfig.hasOwnProperty(operationName)) {
        const operation = (apiConfig as any)[operationName];
        lambdaDataSource.createResolver({
          typeName: operation.operationType === OperationType.Query ? "Query" : "Mutation",
          fieldName: operation.name,
          responseMappingTemplate: appsync.MappingTemplate.fromFile(`${__dirname}/template/response.vtl`),
        });
      }
    }
  }

  private attachDatabaseToBackend(backendFn: NodejsFunction) {
    const projektiTable = this.props.projektiTable;
    projektiTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_PROJEKTI", projektiTable.tableName);

    const archiveTable = this.props.projektiTable;
    archiveTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_PROJEKTI_ARCHIVE", archiveTable.tableName);
  }

  private async getCommonEnvironmentVariables(config: Config): Promise<Record<string, string>> {
    return {
      ENVIRONMENT: Config.env,
      ...(await getEnvironmentVariablesFromSSM()),

      SEARCH_DOMAIN: this.props.searchDomain.domainEndpoint,

      FRONTEND_DOMAIN_NAME: config.frontendDomainName,

      FRONTEND_PRIVATEKEY: await config.getGlobalSecureInfraParameter("FrontendPrivateKey"),

      UPLOAD_BUCKET_NAME: this.props.uploadBucket.bucketName,
      YLLAPITO_BUCKET_NAME: this.props.yllapitoBucket.bucketName,
      PUBLIC_BUCKET_NAME: this.props.publicBucket.bucketName,
      INTERNAL_BUCKET_NAME: this.props.internalBucket.bucketName,
      ARCHIVE_BUCKET_NAME: this.props.archiveBucket.bucketName,
    };
  }
}
