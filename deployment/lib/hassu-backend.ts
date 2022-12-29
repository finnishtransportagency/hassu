import { App, CfnOutput, Duration, Expiration, Fn, Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaInsightsVersion, RuntimeFamily, StartingPosition, Tracing } from "aws-cdk-lib/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Config } from "./config";
import { apiConfig, OperationType } from "../../common/abstractApi";
import { WafConfig } from "./wafConfig";
import { DynamoEventSource, SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as eventTargets from "aws-cdk-lib/aws-events-targets";
import * as events from "aws-cdk-lib/aws-events";
import { IDomain } from "aws-cdk-lib/aws-opensearchservice";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { getEnvironmentVariablesFromSSM, readAccountStackOutputs, readFrontendStackOutputs } from "./setupEnvironment";
import { EmailEventType } from "../../backend/src/email/emailEvent";
import { getOpenSearchDomain } from "./common";

const path = require("path");
const lambdaRuntime = new lambda.Runtime("nodejs16.x", RuntimeFamily.NODEJS);

export type HassuBackendStackProps = {
  projektiTable: Table;
  feedbackTable: Table;
  projektiArchiveTable: Table;
  uploadBucket: Bucket;
  yllapitoBucket: Bucket;
  internalBucket: Bucket;
  publicBucket: Bucket;
};

// These should correspond to CfnOutputs produced by this stack
export type BackendStackOutputs = {
  AppSyncAPIKey?: string;
  AppSyncAPIURL: string;
};

export const backendStackName = "hassu-backend-" + Config.env;

export class HassuBackendStack extends Stack {
  private readonly props: HassuBackendStackProps;

  constructor(scope: App, props: HassuBackendStackProps) {
    const terminationProtection = Config.getEnvConfig().terminationProtection;
    super(scope, "backend", {
      stackName: backendStackName,
      terminationProtection,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
    this.props = props;
  }

  async process(): Promise<void> {
    const config = await Config.instance(this);

    const accountStackOutputs = await readAccountStackOutputs();
    const searchDomain = await getOpenSearchDomain(this, accountStackOutputs);

    const api = this.createAPI(config);
    const commonEnvironmentVariables = await this.getCommonEnvironmentVariables(config, searchDomain);
    const personSearchUpdaterLambda = await this.createPersonSearchUpdaterLambda(commonEnvironmentVariables);
    const aineistoSQS = await this.createAineistoImporterQueue();
    const emailSQS = await this.createEmailQueueSystem();
    const pdfGeneratorLambda = await this.createPdfGeneratorLambda();
    const backendLambda = await this.createBackendLambda(
      commonEnvironmentVariables,
      personSearchUpdaterLambda,
      aineistoSQS,
      pdfGeneratorLambda
    );
    this.attachDatabaseToLambda(backendLambda);
    this.createAndProvideSchedulerExecutionRole(backendLambda, aineistoSQS);
    HassuBackendStack.mapApiResolversToLambda(api, backendLambda);

    const projektiSearchIndexer = this.createProjektiSearchIndexer(commonEnvironmentVariables);
    this.attachDatabaseToLambda(projektiSearchIndexer);
    HassuBackendStack.configureOpenSearchAccess(projektiSearchIndexer, backendLambda, searchDomain);

    const aineistoImporterLambda = await this.createAineistoImporterLambda(commonEnvironmentVariables, aineistoSQS);
    this.attachDatabaseToLambda(aineistoImporterLambda);

    const emailQueueLambda = await this.createEmailQueueLambda(commonEnvironmentVariables, emailSQS);
    this.attachDatabaseToLambda(emailQueueLambda);

    new CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
    if (Config.isDeveloperEnvironment()) {
      new CfnOutput(this, "AppSyncAPIURL", {
        value: api.graphqlUrl || "",
      });
    }
  }

  private static configureOpenSearchAccess(projektiSearchIndexer: NodejsFunction, backendLambda: NodejsFunction, searchDomain: IDomain) {
    // Grant write access to the app-search index
    searchDomain.grantIndexWrite("projekti-" + Config.env + "-*", projektiSearchIndexer);
    searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", backendLambda);
  }

  private createAPI(config: Config) {
    let defaultAuthorization: appsync.AuthorizationMode;
    if (Config.isDeveloperEnvironment()) {
      defaultAuthorization = {
        authorizationType: appsync.AuthorizationType.IAM,
      };
    } else {
      const apiKeyExpiration = HassuBackendStack.createApiKeyExpiration();
      defaultAuthorization = {
        authorizationType: appsync.AuthorizationType.API_KEY,
        apiKeyConfig: {
          expires: Expiration.atDate(apiKeyExpiration),
        },
      };
    }

    const api = new appsync.GraphqlApi(this, "Api", {
      name: "hassu-api-" + Config.env,
      schema: appsync.Schema.fromAsset("schema.graphql"),
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
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

  private createProjektiSearchIndexer(commonEnvironmentVariables: Record<string, string>) {
    const functionName = "hassu-dynamodb-stream-handler-" + Config.env;
    const streamHandler = new NodejsFunction(this, "DynamoDBStreamHandler", {
      functionName,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/projektiSearch/dynamoDBStreamHandler.ts`,
      handler: "handleDynamoDBEvents",
      memorySize: 256,
      bundling: {
        minify: true,
        externalModules: [], // Include latest aws-sdk. Required to have AWS Scheduler Required to have AWS Scheduler
      },
      environment: {
        HASSU_XRAY_DOWNSTREAM_ENABLED: "false", // Estetään ylisuurten x-ray-tracejen synty koko indeksin uudelleenpäivityksessä
        ...commonEnvironmentVariables,
      },
      timeout: Duration.seconds(120),
      tracing: Tracing.ACTIVE,
    });
    this.addPermissionsForMonitoring(streamHandler);
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: ["arn:aws:lambda:eu-west-1:" + this.account + ":function:" + functionName],
      })
    );

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
    personSearchUpdaterLambda: NodejsFunction,
    aineistoSQS: Queue,
    pdfGeneratorLambda: NodejsFunction
  ) {
    let define;
    if (Config.isDeveloperEnvironment()) {
      define = {
        // Replace strings during build time
        "process.env.USER_IDENTIFIER_FUNCTIONS": JSON.stringify("../../developer/identifyIAMUser"),
      };
    }

    const frontendStackOutputs = await readFrontendStackOutputs();
    const backendLambda = new NodejsFunction(this, "API", {
      functionName: "hassu-backend-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/apiHandler.ts`,
      handler: "handleEvent",
      memorySize: 1769,
      timeout: Duration.seconds(29),
      bundling: {
        define,
        minify: true,
        metafile: false,
        externalModules: [], // Include latest aws-sdk
      },
      environment: {
        ...commonEnvironmentVariables,
        PERSON_SEARCH_UPDATER_LAMBDA_ARN: personSearchUpdaterLambda.functionArn,
        PDF_GENERATOR_LAMBDA_ARN: pdfGeneratorLambda.functionArn,
        FRONTEND_PUBLIC_KEY_ID: frontendStackOutputs?.FrontendPublicKeyIdOutput,
        AINEISTO_IMPORT_SQS_URL: aineistoSQS.queueUrl,
        AINEISTO_IMPORT_SQS_ARN: aineistoSQS.queueArn,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_98_0,
    });
    this.addPermissionsForMonitoring(backendLambda);
    backendLambda.addToRolePolicy(
      new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter", "cloudfront:CreateInvalidation"], resources: ["*"] })
    );
    backendLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [personSearchUpdaterLambda.functionArn],
      })
    );
    backendLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [pdfGeneratorLambda.functionArn],
      })
    );

    aineistoSQS.grantSendMessages(backendLambda);

    this.props.uploadBucket.grantPut(backendLambda);
    this.props.uploadBucket.grantReadWrite(backendLambda);
    this.props.yllapitoBucket.grantReadWrite(backendLambda);
    this.props.internalBucket.grantReadWrite(backendLambda);
    this.props.publicBucket.grantReadWrite(backendLambda);
    return backendLambda;
  }

  private addPermissionsForMonitoring(lambda: NodejsFunction) {
    lambda.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLambdaInsightsExecutionRolePolicy"));
    lambda.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"));
  }

  private async createPdfGeneratorLambda() {
    const pdfGeneratorLambda = new NodejsFunction(this, "PDFGeneratorLambda", {
      functionName: "hassu-pdf-generator-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/asiakirja/lambda/pdfGeneratorHandler.ts`,
      handler: "handleEvent",
      memorySize: 1769,
      timeout: Duration.seconds(29),
      bundling: {
        minify: true,
        nodeModules: ["pdfkit"],
        externalModules: [], // Include latest aws-sdk
        metafile: true,
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `${path.normalize("./node_modules/.bin/copyfiles")} -f -u 1 ${inputDir}/backend/src/asiakirja/files/* ${outputDir}/files`,
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
      tracing: Tracing.ACTIVE,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_98_0,
    });
    this.addPermissionsForMonitoring(pdfGeneratorLambda);
    pdfGeneratorLambda.addToRolePolicy(new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter"], resources: ["*"] })); // listKirjaamoOsoitteet requires this
    return pdfGeneratorLambda;
  }

  private async createPersonSearchUpdaterLambda(commonEnvironmentVariables: Record<string, string>) {
    const personSearchLambda = new NodejsFunction(this, "PersonSearchUpdaterLambda", {
      functionName: "hassu-personsearchupdater-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/personSearch/lambda/personSearchUpdaterHandler.ts`,
      handler: "handleEvent",
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(120),
      retryAttempts: 0,
      bundling: {
        minify: true,
        externalModules: [], // Include latest aws-sdk
      },
      environment: {
        ...commonEnvironmentVariables,
      },
      tracing: Tracing.ACTIVE,
    });
    this.addPermissionsForMonitoring(personSearchLambda);
    this.props.internalBucket.grantReadWrite(personSearchLambda);
    return personSearchLambda;
  }

  private async createAineistoImporterLambda(
    commonEnvironmentVariables: Record<string, string>,
    aineistoSQS: Queue
  ): Promise<NodejsFunction> {
    const frontendStackOutputs = await readFrontendStackOutputs();

    const importer = new NodejsFunction(this, "AineistoImporterLambda", {
      functionName: "hassu-aineistoimporter-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/aineisto/aineistoImporterLambda.ts`,
      handler: "handleEvent",
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(600),
      bundling: {
        minify: true,
        externalModules: [], // Include latest aws-sdk
      },
      environment: {
        ...commonEnvironmentVariables,
        AINEISTO_IMPORT_SQS_URL: aineistoSQS.queueUrl,
        AINEISTO_IMPORT_SQS_ARN: aineistoSQS.queueArn,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      },
      tracing: Tracing.ACTIVE,
    });
    this.addPermissionsForMonitoring(importer);

    this.props.yllapitoBucket.grantReadWrite(importer);
    this.props.publicBucket.grantReadWrite(importer);

    if (frontendStackOutputs?.CloudfrontDistributionId) {
      importer.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:CreateInvalidation"],
          resources: ["arn:aws:cloudfront::" + this.account + ":distribution/" + frontendStackOutputs?.CloudfrontDistributionId],
        })
      );
    }

    const eventSource = new SqsEventSource(aineistoSQS, { batchSize: 1 });
    importer.addEventSource(eventSource);
    return importer;
  }

  private async createEmailQueueLambda(commonEnvironmentVariables: Record<string, string>, emailSQS: Queue): Promise<NodejsFunction> {
    const importer = new NodejsFunction(this, "EmailQueueLambda", {
      functionName: "hassu-email-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/email/emailSQSHandler.ts`,
      handler: "handleEvent",
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(60),
      bundling: {
        minify: true,
        externalModules: [], // Include latest aws-sdk
      },
      environment: {
        ...commonEnvironmentVariables,
      },
      tracing: Tracing.ACTIVE,
    });
    this.addPermissionsForMonitoring(importer);

    const eventSource = new SqsEventSource(emailSQS, { batchSize: 1 });
    importer.addEventSource(eventSource);
    return importer;
  }

  private static mapApiResolversToLambda(api: appsync.GraphqlApi, backendFn: NodejsFunction) {
    const lambdaDataSource = api.addLambdaDataSource("lambdaDatasource", backendFn);

    for (const operationName in apiConfig) {
      // eslint-disable-next-line no-prototype-builtins
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

  private attachDatabaseToLambda(backendFn: NodejsFunction) {
    const projektiTable = this.props.projektiTable;
    projektiTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_PROJEKTI", projektiTable.tableName);

    const feedbackTable = this.props.feedbackTable;
    feedbackTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_FEEDBACK", feedbackTable.tableName);
  }

  private async getCommonEnvironmentVariables(config: Config, searchDomain: IDomain): Promise<Record<string, string>> {
    return {
      ENVIRONMENT: Config.env,
      TZ: "Europe/Helsinki",
      ...(await getEnvironmentVariablesFromSSM()),

      SEARCH_DOMAIN: searchDomain.domainEndpoint,

      FRONTEND_DOMAIN_NAME: config.frontendDomainName,

      FRONTEND_PRIVATEKEY: await config.getGlobalSecureInfraParameter("FrontendPrivateKey"),

      UPLOAD_BUCKET_NAME: this.props.uploadBucket.bucketName,
      YLLAPITO_BUCKET_NAME: this.props.yllapitoBucket.bucketName,
      PUBLIC_BUCKET_NAME: this.props.publicBucket.bucketName,
      INTERNAL_BUCKET_NAME: this.props.internalBucket.bucketName,
    };
  }

  private async createAineistoImporterQueue() {
    return new Queue(this, "AineistoImporter", {
      queueName: "aineisto-importer-" + Config.env + ".fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.minutes(10),
    });
  }

  private async createEmailQueueSystem() {
    const queue = new Queue(this, "EmailQueue", {
      queueName: "email-" + Config.env,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
    new events.Rule(this, "EmailDigestSchedulerRule", {
      schedule: events.Schedule.cron({ year: "*", month: "*", weekDay: "MON", hour: "5", minute: "0" }),
      targets: [
        new eventTargets.SqsQueue(queue, {
          maxEventAge: Duration.hours(24),
          retryAttempts: 10,
          message: events.RuleTargetInput.fromObject({ type: EmailEventType.UUDET_PALAUTTEET_DIGEST }),
        }),
      ],
    });
    return queue;
  }

  private createAndProvideSchedulerExecutionRole(backendLambda: NodejsFunction, aineistoSQS: Queue) {
    const servicePrincipal = new ServicePrincipal("scheduler.amazonaws.com");
    const role = new Role(this, "schedulerExecutionRole", {
      assumedBy: servicePrincipal,
      roleName: "schedulerExecutionRole-" + Config.env,
      path: "/",
      inlinePolicies: {
        sendSQS: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["sqs:SendMessage"],
              resources: [aineistoSQS.queueArn],
            }),
          ],
        }),
      },
    });
    backendLambda.addEnvironment("SCHEDULER_EXECUTION_ROLE_ARN", role.roleArn);
    backendLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["scheduler:CreateSchedule", "scheduler:DeleteSchedule", "scheduler:ListSchedules"],
        resources: ["*"],
      })
    );
    backendLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [role.roleArn],
      })
    );
  }
}
