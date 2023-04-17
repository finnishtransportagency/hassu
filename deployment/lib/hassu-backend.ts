import { App, aws_scheduler, CfnOutput, Duration, Expiration, Fn, Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaInsightsVersion, LayerVersion, RuntimeFamily, StartingPosition, Tracing } from "aws-cdk-lib/aws-lambda";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Config } from "./config";
import { apiConfig, OperationConfig, OperationType } from "../../common/abstractApi";
import { WafConfig } from "./wafConfig";
import { DynamoEventSource, SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as eventTargets from "aws-cdk-lib/aws-events-targets";
import * as events from "aws-cdk-lib/aws-events";
import { IDomain } from "aws-cdk-lib/aws-opensearchservice";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { getEnvironmentVariablesFromSSM, readAccountStackOutputs, readFrontendStackOutputs } from "./setupEnvironment";
import { EmailEventType } from "../../backend/src/email/emailEvent";
import { createResourceGroup, getOpenSearchDomain } from "./common";

const path = require("path");
const lambdaRuntime = new lambda.Runtime("nodejs16.x", RuntimeFamily.NODEJS);
const insightsVersion = LambdaInsightsVersion.VERSION_1_0_143_0;
// layers/lambda-base valmiiksi asennetut kirjastot
const externalModules = ["aws-sdk", "aws-xray-sdk-core", "nodemailer"];

export type HassuBackendStackProps = {
  projektiTable: Table;
  lyhytOsoiteTable: Table;
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
  AineistoImportSqsUrl: string;
};

export const backendStackName = "hassu-backend-" + Config.env;

export class HassuBackendStack extends Stack {
  private readonly props: HassuBackendStackProps;
  private layers: lambda.ILayerVersion[];
  public aineistoImportQueue: Queue;
  private config: Config;

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

    this.layers = [
      new lambda.LayerVersion(this, "BaseLayer-" + Config.env, {
        code: lambda.Code.fromAsset("./layers/lambda-base"),
        compatibleRuntimes: [lambdaRuntime],
        description: "Lambda base layer",
      }),
      LayerVersion.fromLayerVersionArn(
        this,
        "paramLayer",
        "arn:aws:lambda:eu-west-1:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:4"
      ),
    ];
  }

  async process(): Promise<void> {
    const config = await Config.instance(this);
    this.config = config;

    const accountStackOutputs = await readAccountStackOutputs();
    const searchDomain = await getOpenSearchDomain(this, accountStackOutputs);

    const api = this.createAPI(config);
    const commonEnvironmentVariables = await this.getCommonEnvironmentVariables(config, searchDomain);

    const personSearchUpdaterLambda = await this.createPersonSearchUpdaterLambda(commonEnvironmentVariables);
    const aineistoSQS = await this.createAineistoImporterQueue();
    this.aineistoImportQueue = aineistoSQS;
    const emailSQS = await this.createEmailQueueSystem();
    const pdfGeneratorLambda = await this.createPdfGeneratorLambda(config);
    const yllapitoBackendLambda = await this.createBackendLambda(
      commonEnvironmentVariables,
      personSearchUpdaterLambda,
      aineistoSQS,
      pdfGeneratorLambda,
      true
    );
    this.attachDatabaseToLambda(yllapitoBackendLambda, true);
    HassuBackendStack.mapApiResolversToLambda(api, yllapitoBackendLambda, true);

    const julkinenBackendLambda = await this.createBackendLambda(
      commonEnvironmentVariables,
      personSearchUpdaterLambda,
      aineistoSQS,
      pdfGeneratorLambda,
      false
    );
    this.attachDatabaseToLambda(julkinenBackendLambda, false);
    HassuBackendStack.mapApiResolversToLambda(api, julkinenBackendLambda, false);

    const projektiSearchIndexer = this.createProjektiSearchIndexer(commonEnvironmentVariables);
    this.attachDatabaseToLambda(projektiSearchIndexer, true);

    const aineistoImporterLambda = await this.createAineistoImporterLambda(commonEnvironmentVariables, aineistoSQS);
    this.attachDatabaseToLambda(aineistoImporterLambda, true);

    this.createAndProvideSchedulerExecutionRole(aineistoSQS, yllapitoBackendLambda, aineistoImporterLambda, projektiSearchIndexer);

    HassuBackendStack.configureOpenSearchAccess(
      projektiSearchIndexer,
      [yllapitoBackendLambda, aineistoImporterLambda],
      julkinenBackendLambda,
      searchDomain
    );

    const emailQueueLambda = await this.createEmailQueueLambda(commonEnvironmentVariables, emailSQS);
    this.attachDatabaseToLambda(emailQueueLambda, true);

    new CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
    new CfnOutput(this, "AineistoImportSqsUrl", {
      value: aineistoSQS.queueUrl || "",
    });
    if (Config.isDeveloperEnvironment()) {
      new CfnOutput(this, "AppSyncAPIURL", {
        value: api.graphqlUrl || "",
      });
    }
    createResourceGroup(this); // Ympäristön valitsemiseen esim. CloudWatchissa
  }

  private static configureOpenSearchAccess(
    projektiSearchIndexer: NodejsFunction,
    yllapitoBackendLambdas: NodejsFunction[],
    julkinenBackendLambda: NodejsFunction,
    searchDomain: IDomain
  ) {
    // Grant write access to the app-search index
    searchDomain.grantIndexWrite("projekti-" + Config.env + "-*", projektiSearchIndexer);
    yllapitoBackendLambdas.forEach((lambda) => searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", lambda));
    searchDomain.grantIndexRead("projekti-" + Config.env + "-*", julkinenBackendLambda);
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
        sourceMap: true,
        externalModules,
      },
      environment: {
        HASSU_XRAY_DOWNSTREAM_ENABLED: "false", // Estetään ylisuurten x-ray-tracejen synty koko indeksin uudelleenpäivityksessä
        ...commonEnvironmentVariables,
      },
      timeout: Duration.seconds(120),
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
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
    pdfGeneratorLambda: NodejsFunction,
    isYllapitoBackend: boolean
  ) {
    let define;
    if (Config.isDeveloperEnvironment() && isYllapitoBackend) {
      define = {
        // Replace strings during build time
        "process.env.USER_IDENTIFIER_FUNCTIONS": JSON.stringify("../../developer/identifyIAMUser"),
      };
    }

    const frontendStackOutputs = await readFrontendStackOutputs();
    let backendName: string;
    let entry: string;
    let backendEnvironmentVariables: Record<string, string> = {};
    if (isYllapitoBackend) {
      backendName = "";
      entry = `${__dirname}/../../backend/src/apiHandler.ts`;
      backendEnvironmentVariables = {
        PERSON_SEARCH_UPDATER_LAMBDA_ARN: personSearchUpdaterLambda.functionArn,
        PDF_GENERATOR_LAMBDA_ARN: pdfGeneratorLambda.functionArn,
        FRONTEND_PUBLIC_KEY_ID: frontendStackOutputs?.FrontendPublicKeyIdOutput,
        AINEISTO_IMPORT_SQS_URL: aineistoSQS.queueUrl,
        AINEISTO_IMPORT_SQS_ARN: aineistoSQS.queueArn,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      };
    } else {
      backendName = "-julkinen";
      entry = `${__dirname}/../../backend/src/apiHandlerJulkinen.ts`;
    }
    const backendLambda = new NodejsFunction(this, "API" + backendName, {
      functionName: "hassu-backend" + backendName + "-" + Config.env,
      runtime: lambdaRuntime,
      entry,
      handler: "handleEvent",
      memorySize: 1792,
      timeout: Duration.seconds(29),
      bundling: {
        define,
        sourceMap: true,
        minify: true,
        metafile: false,
        externalModules,
      },
      environment: {
        ...commonEnvironmentVariables,
        ...backendEnvironmentVariables,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
    });
    this.addPermissionsForMonitoring(backendLambda);
    if (isYllapitoBackend) {
      backendLambda.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "ssm:GetParameter",
            "cloudfront:CreateInvalidation",
            "es:ESHttpGet",
            "es:ESHttpPut",
            "es:ESHttpPost",
            "es:ESHttpDelete",
          ],
          resources: ["*"],
        })
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
      this.props.yllapitoBucket.grantReadWrite(backendLambda);
      this.grantInternalBucket(backendLambda);
      this.props.publicBucket.grantReadWrite(backendLambda);
    } else {
      backendLambda.addToRolePolicy(
        new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter", "es:ESHttpGet", "es:ESHttpPost"], resources: ["*"] })
      );

      const virusScannerLambdaArn = await this.config.getParameterNow("VirusScannerLambdaArn");
      backendLambda.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [virusScannerLambdaArn, virusScannerLambdaArn + ":*"],
        })
      );

      // Julkiselle backendille lupa päivittää projektille lippu uusista palautteista
      const allowUusiaPalautteitaUpdate = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [this.props.projektiTable.tableArn],
        actions: ["dynamodb:UpdateItem"],
      });
      allowUusiaPalautteitaUpdate.addCondition("ForAllValues:StringEquals", { "dynamodb:Attributes": ["oid", "uusiaPalautteita"] });
      backendLambda.addToRolePolicy(allowUusiaPalautteitaUpdate);

      this.props.yllapitoBucket.grantReadWrite(backendLambda, "*/muistutukset/*");
      this.props.yllapitoBucket.grantReadWrite(backendLambda, "*/palautteet/*");
      this.props.yllapitoBucket.grantRead(backendLambda, "*/nahtavillaolo/*"); // Nähtävilläolon lisäaineistoa varten lukuoikeus
      this.props.publicBucket.grantRead(backendLambda);
      this.grantInternalBucket(backendLambda, "cache/bankHolidays.json");
    }
    this.props.uploadBucket.grantPut(backendLambda);
    this.props.uploadBucket.grantReadWrite(backendLambda);
    return backendLambda;
  }

  private grantInternalBucket(lambda: NodejsFunction, pattern?: string) {
    lambda.addEnvironment("INTERNAL_BUCKET_NAME", this.props.internalBucket.bucketName);
    this.props.internalBucket.grantReadWrite(lambda, pattern);
  }

  private grantYllapitoBucketRead(lambda: NodejsFunction) {
    lambda.addEnvironment("YLLAPITO_BUCKET_NAME", this.props.yllapitoBucket.bucketName);
    this.props.yllapitoBucket.grantRead(lambda);
  }

  private addPermissionsForMonitoring(lambda: NodejsFunction) {
    lambda.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLambdaInsightsExecutionRolePolicy"));
    lambda.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"));
  }

  private async createPdfGeneratorLambda(config: Config) {
    const pdfGeneratorLambda = new NodejsFunction(this, "PDFGeneratorLambda", {
      functionName: "hassu-pdf-generator-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/asiakirja/lambda/pdfGeneratorHandler.ts`,
      handler: "handleEvent",
      memorySize: 1792,
      timeout: Duration.seconds(29),
      bundling: {
        minify: true,
        sourceMap: true,
        nodeModules: ["pdfkit", "pdfkit-table"],
        externalModules,
        metafile: false,
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
      environment: { FRONTEND_DOMAIN_NAME: config.frontendDomainNames[0], NODE_OPTIONS: "--enable-source-maps" },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
    });
    this.addPermissionsForMonitoring(pdfGeneratorLambda);
    pdfGeneratorLambda.addToRolePolicy(new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter"], resources: ["*"] })); // listKirjaamoOsoitteet requires this
    this.grantInternalBucket(pdfGeneratorLambda); // Vapaapäivien cachetusta varten
    this.grantYllapitoBucketRead(pdfGeneratorLambda); // Logon lukemista varten pdf:iin
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
        sourceMap: true,
        externalModules,
      },
      environment: {
        ...commonEnvironmentVariables,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
    });
    this.addPermissionsForMonitoring(personSearchLambda);
    this.grantInternalBucket(personSearchLambda); // Käyttäjälistan cachetusta varten
    return personSearchLambda;
  }

  private async createAineistoImporterLambda(
    commonEnvironmentVariables: Record<string, string>,
    aineistoSQS: Queue
  ): Promise<NodejsFunction> {
    const frontendStackOutputs = await readFrontendStackOutputs();
    const concurrency = 10;
    const importer = new NodejsFunction(this, "AineistoImporterLambda", {
      functionName: "hassu-aineistoimporter-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/aineisto/aineistoImporterLambda.ts`,
      handler: "handleEvent",
      memorySize: 1024,
      reservedConcurrentExecutions: concurrency,
      timeout: Duration.seconds(600),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules,
      },
      environment: {
        ...commonEnvironmentVariables,
        AINEISTO_IMPORT_SQS_URL: aineistoSQS.queueUrl,
        AINEISTO_IMPORT_SQS_ARN: aineistoSQS.queueArn,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
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

    const eventSource = new SqsEventSource(aineistoSQS, { batchSize: 1, maxConcurrency: concurrency });
    importer.addEventSource(eventSource);
    aineistoSQS.grantSendMessages(importer);
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
        sourceMap: true,
        externalModules,
      },
      environment: {
        ...commonEnvironmentVariables,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
    });
    this.addPermissionsForMonitoring(importer);

    const eventSource = new SqsEventSource(emailSQS, { batchSize: 1 });
    importer.addEventSource(eventSource);
    return importer;
  }

  private static mapApiResolversToLambda(api: appsync.GraphqlApi, backendFn: NodejsFunction, isYllapitoBackend: boolean) {
    const datasourceName = "lambdaDatasource" + (isYllapitoBackend ? "Yllapito" : "Julkinen");
    const lambdaDataSource = api.addLambdaDataSource(datasourceName, backendFn, { name: datasourceName });

    for (const operationName in apiConfig) {
      // eslint-disable-next-line no-prototype-builtins
      if (apiConfig.hasOwnProperty(operationName)) {
        const operation: OperationConfig = (apiConfig as any)[operationName];
        if (!!operation.isYllapitoOperation == isYllapitoBackend) {
          const props = {
            typeName: operation.operationType === OperationType.Query ? "Query" : "Mutation",
            fieldName: operation.name,
            responseMappingTemplate: appsync.MappingTemplate.fromFile(`${__dirname}/template/response.vtl`),
          };
          lambdaDataSource.createResolver(props);
        }
      }
    }
  }

  private attachDatabaseToLambda(backendFn: NodejsFunction, isYllapitoBackend: boolean) {
    const projektiTable = this.props.projektiTable;
    const lyhytOsoiteTable = this.props.lyhytOsoiteTable;
    if (isYllapitoBackend) {
      projektiTable.grantFullAccess(backendFn);
      lyhytOsoiteTable.grantFullAccess(backendFn);
      backendFn.addEnvironment("TABLE_LYHYTOSOITE", lyhytOsoiteTable.tableName);
    } else {
      projektiTable.grantReadData(backendFn);
    }
    backendFn.addEnvironment("TABLE_PROJEKTI", projektiTable.tableName);

    const feedbackTable = this.props.feedbackTable;
    feedbackTable.grantFullAccess(backendFn);
    backendFn.addEnvironment("TABLE_FEEDBACK", feedbackTable.tableName);
  }

  private async getCommonEnvironmentVariables(config: Config, searchDomain: IDomain): Promise<Record<string, string>> {
    const variables: Record<string, string> = {
      ENVIRONMENT: Config.env,
      INFRA_ENVIRONMENT: Config.infraEnvironment,
      TZ: "Europe/Helsinki",
      NODE_OPTIONS: "--enable-source-maps",
      PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: "none",
      ...(await getEnvironmentVariablesFromSSM()),

      SEARCH_DOMAIN: searchDomain.domainEndpoint,

      FRONTEND_DOMAIN_NAME: config.frontendDomainNames[0],

      UPLOAD_BUCKET_NAME: this.props.uploadBucket.bucketName,
      YLLAPITO_BUCKET_NAME: this.props.yllapitoBucket.bucketName,
      PUBLIC_BUCKET_NAME: this.props.publicBucket.bucketName,
    };
    if (config.frontendDomainNames[1]) {
      variables.FRONTEND_SECONDARY_DOMAIN_NAME = config.frontendDomainNames[1];
    }
    return variables;
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

  private createAndProvideSchedulerExecutionRole(aineistoSQS: Queue, ...backendLambdas: NodejsFunction[]) {
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
    for (const backendLambda of backendLambdas) {
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

    // Erotellaan eri ympäristöjen schedule rulet groupin perusteella
    new aws_scheduler.CfnScheduleGroup(this, "scheduleGroup", { name: Config.env });
  }
}
