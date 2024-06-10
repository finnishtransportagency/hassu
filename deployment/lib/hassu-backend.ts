import { App, aws_scheduler, CfnOutput, Duration, Expiration, Fn, Stack } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  DockerImageCode,
  DockerImageFunction,
  LambdaInsightsVersion,
  LayerVersion,
  StartingPosition,
  Tracing,
} from "aws-cdk-lib/aws-lambda";
import * as appsync from "aws-cdk-lib/aws-appsync";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Config } from "./config";
import { ApiConfig, apiConfig, OperationConfig, OperationType } from "../../common/abstractApi";
import { WafConfig } from "./wafConfig";
import { DynamoEventSource, SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as eventTargets from "aws-cdk-lib/aws-events-targets";
import * as events from "aws-cdk-lib/aws-events";
import { IDomain } from "aws-cdk-lib/aws-opensearchservice";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { getEnvironmentVariablesFromSSM, readAccountStackOutputs, readFrontendStackOutputs } from "./setupEnvironment";
import { createResourceGroup, getOpenSearchDomain } from "./common";
import * as ssm from "aws-cdk-lib/aws-ssm";
import path from "path";
import { ASIANHALLINTA_LAMBDA_VERSION } from "@hassu/asianhallinta";
import { EmailEventType } from "../../backend/src/email/model/emailEvent";
import assert from "assert";
import { IVpc, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

const lambdaRuntime = lambda.Runtime.NODEJS_18_X;
const insightsVersion = LambdaInsightsVersion.VERSION_1_0_143_0;
// layers/lambda-base valmiiksi asennetut kirjastot
const externalModules = ["aws-xray-sdk-core", "nodemailer", "@aws-sdk/*"];

export type HassuBackendStackProps = {
  awsAccountId: string;
  projektiTable: Table;
  lyhytOsoiteTable: Table;
  feedbackTable: Table;
  projektiArchiveTable: Table;
  kiinteistonomistajaTable: Table;
  projektiMuistuttajaTable: Table;
  uploadBucket: Bucket;
  yllapitoBucket: Bucket;
  internalBucket: Bucket;
  publicBucket: Bucket;
};

// These should correspond to CfnOutputs produced by this stack
export type BackendStackOutputs = {
  AppSyncAPIKey?: string;
  AppSyncAPIURL: string;
  EventSqsUrl: string;
  PdfGeneratorLambda: string;
  HyvaksymisEsitysSqsUrl: string;
};

export const backendStackName = "hassu-backend-" + Config.env;

export class HassuBackendStack extends Stack {
  private readonly props: HassuBackendStackProps;
  private readonly layers: lambda.ILayerVersion[];
  public eventQueue: Queue;
  public asianhallintaQueue: Queue;
  private config: Config;

  constructor(scope: App, props: HassuBackendStackProps) {
    const terminationProtection = Config.getEnvConfig().terminationProtection;
    super(scope, "backend", {
      stackName: backendStackName,
      terminationProtection,
      env: {
        account: props.awsAccountId,
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
        "arn:aws:lambda:eu-west-1:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:11"
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

    const vpc = await this.getVpc();
    const personSearchUpdaterLambda = await this.createPersonSearchUpdaterLambda(commonEnvironmentVariables, vpc);
    // TODO: Remove once no schedules for this queue
    const aineistoSQS = this.createAineistoImporterQueue();
    const eventSQS = this.createEventQueue();
    this.eventQueue = eventSQS; // TODO: Miksi?
    const hyvaksymisEsitysSQS = this.createHyvaksymisEsitysAineistoQueue();
    const emailSQS = await this.createEmailQueueSystem();
    const pdfGeneratorLambda = await this.createPdfGeneratorLambda(config);
    const asianhallintaSQS: Queue = this.createAsianhallintaSQS();
    const asianhallintaLambda = await this.createAsianhallintaLambda(asianhallintaSQS, vpc);
    const kiinteistoSQS = this.createKiinteistoQueue();
    this.createKiinteistoLambda(kiinteistoSQS, vpc);
    const suomiFiSQS = this.createSuomiFiQueue();
    const suomifiLambda = this.createSuomiFiLambda(suomiFiSQS, vpc, config, pdfGeneratorLambda);
    const yllapitoBackendLambda = await this.createBackendLambda(
      commonEnvironmentVariables,
      personSearchUpdaterLambda,
      eventSQS,
      hyvaksymisEsitysSQS,
      asianhallintaSQS,
      kiinteistoSQS,
      suomiFiSQS,
      pdfGeneratorLambda,
      true,
      suomifiLambda,
      vpc
    );
    yllapitoBackendLambda.addToRolePolicy(
      new PolicyStatement({ effect: Effect.ALLOW, actions: ["lambda:InvokeFunction"], resources: [asianhallintaLambda.functionArn] })
    );
    this.attachDatabaseToLambda(yllapitoBackendLambda, true);
    HassuBackendStack.mapApiResolversToLambda(api, yllapitoBackendLambda, true);

    const julkinenBackendLambda = await this.createBackendLambda(
      commonEnvironmentVariables,
      personSearchUpdaterLambda,
      eventSQS,
      hyvaksymisEsitysSQS,
      asianhallintaSQS,
      kiinteistoSQS,
      suomiFiSQS,
      pdfGeneratorLambda,
      false,
      suomifiLambda,
      vpc
    );
    this.attachDatabaseToLambda(julkinenBackendLambda, false);
    HassuBackendStack.mapApiResolversToLambda(api, julkinenBackendLambda, false);

    const projektiSearchIndexer = this.createProjektiSearchIndexer(commonEnvironmentVariables);
    this.attachDatabaseToLambda(projektiSearchIndexer, true);

    const sqsEventHandlerLambda = await this.createSqsEventHandlerLambda(commonEnvironmentVariables, eventSQS, aineistoSQS, suomiFiSQS);
    const hyvaksymisEsitysAineistoHandlerLambda = await this.createHyvaksymisEsitysAineistoLambda(
      commonEnvironmentVariables,
      hyvaksymisEsitysSQS
    );
    const omistajaSearchIndexer = this.createOmistajaSearchIndexer(commonEnvironmentVariables);
    const muistuttajaSearchIndexer = this.createMuistuttajaSearchIndexer(commonEnvironmentVariables);
    this.attachDatabaseToLambda(omistajaSearchIndexer, true);
    this.attachDatabaseToLambda(muistuttajaSearchIndexer, true);

    this.attachDatabaseToLambda(sqsEventHandlerLambda, true);

    // TODO: Riittääkö nämä kaksi??
    hyvaksymisEsitysAineistoHandlerLambda.addEnvironment("TABLE_PROJEKTI", this.props.projektiTable.tableName);
    this.props.projektiTable.grantFullAccess(hyvaksymisEsitysAineistoHandlerLambda); // TODO: riittääkö read ja write? onko update ja put silloin kielletty?

    // TODO: tarvitseeko hyvaksymisEsitysAineistoLambda tätä?
    this.createAndProvideSchedulerExecutionRole(
      eventSQS,
      aineistoSQS,
      hyvaksymisEsitysSQS,
      hyvaksymisEsitysAineistoHandlerLambda,
      yllapitoBackendLambda,
      sqsEventHandlerLambda,
      projektiSearchIndexer
    );

    // TODO: tarvitseeko hyvaksymisEsitysAineistoLambda tätä?
    HassuBackendStack.configureOpenSearchAccess(
      projektiSearchIndexer,
      [yllapitoBackendLambda, sqsEventHandlerLambda],
      julkinenBackendLambda,
      searchDomain
    );

    searchDomain.grantIndexWrite("projekti-" + Config.env + "-*", omistajaSearchIndexer);
    searchDomain.grantIndexWrite("projekti-" + Config.env + "-*", muistuttajaSearchIndexer);

    const emailQueueLambda = await this.createEmailQueueLambda(commonEnvironmentVariables, emailSQS);
    this.attachDatabaseToLambda(emailQueueLambda, true);

    new CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey ?? "",
    });
    new CfnOutput(this, "EventSqsUrl", {
      value: eventSQS.queueUrl ?? "",
    });
    new CfnOutput(this, "HyvaksymisEsitysSqsUrl", {
      // TODO: Mitä tää tekee? Tuleeko tästä backend stack output??
      value: hyvaksymisEsitysSQS.queueUrl ?? "",
    });
    if (Config.isDeveloperEnvironment()) {
      new CfnOutput(this, "AppSyncAPIURL", {
        value: api.graphqlUrl ?? "",
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
    yllapitoBackendLambdas.forEach((func) => searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", func));
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
      schema: appsync.SchemaFile.fromAsset("schema.graphql"),
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
    const resourcePrefix = "arn:aws:lambda:eu-west-1:" + this.account + ":function:";
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
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(streamHandler);
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [resourcePrefix + functionName],
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

    const indexerQueue = this.createIndexerQueue();
    streamHandler.node.addDependency(indexerQueue);
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["sqs:SendMessage"], resources: [indexerQueue.queueArn] }));
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["ssm:GetParameter"], resources: ["*"] }));
    streamHandler.addEventSource(new SqsEventSource(indexerQueue, { batchSize: 1, maxConcurrency: 10 }));
    return streamHandler;
  }

  private createOmistajaSearchIndexer(commonEnvironmentVariables: Record<string, string>) {
    const resourcePrefix = "arn:aws:lambda:eu-west-1:" + this.account + ":function:";
    const functionName = "hassu-omistaja-dynamodb-stream-handler-" + Config.env;
    const streamHandler = new NodejsFunction(this, "OmistajaDynamoDBStreamHandler", {
      functionName,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/projektiSearch/omistajaSearch/omistajaDynamoDBStreamHandler.ts`,
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
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(streamHandler);
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [resourcePrefix + functionName],
      })
    );
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["es:ESHttpGet", "es:ESHttpPut", "es:ESHttpPost", "es:ESHttpDelete"],
        resources: ["*"],
      })
    );

    streamHandler.addEventSource(
      new DynamoEventSource(this.props.kiinteistonomistajaTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 5,
        bisectBatchOnError: true,
        retryAttempts: 5,
        maxBatchingWindow: Duration.seconds(1),
      })
    );

    const indexerQueue = this.createOmistajaIndexerQueue();
    streamHandler.node.addDependency(indexerQueue);
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["sqs:SendMessage"], resources: [indexerQueue.queueArn] }));
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["ssm:GetParameter"], resources: ["*"] }));
    streamHandler.addEventSource(
      new SqsEventSource(indexerQueue, { batchSize: 100, maxConcurrency: 10, maxBatchingWindow: Duration.seconds(5) })
    );
    return streamHandler;
  }

  private createMuistuttajaSearchIndexer(commonEnvironmentVariables: Record<string, string>) {
    const resourcePrefix = "arn:aws:lambda:eu-west-1:" + this.account + ":function:";
    const functionName = "hassu-muistuttaja-dynamodb-stream-handler-" + Config.env;
    const streamHandler = new NodejsFunction(this, "MuistuttajaDynamoDBStreamHandler", {
      functionName,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/projektiSearch/muistuttajaSearch/muistuttajaDynamoDBStreamHandler.ts`,
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
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(streamHandler);
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [resourcePrefix + functionName],
      })
    );
    streamHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["es:ESHttpGet", "es:ESHttpPut", "es:ESHttpPost", "es:ESHttpDelete"],
        resources: ["*"],
      })
    );

    streamHandler.addEventSource(
      new DynamoEventSource(this.props.projektiMuistuttajaTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 5,
        bisectBatchOnError: true,
        retryAttempts: 5,
        maxBatchingWindow: Duration.seconds(1),
      })
    );

    const indexerQueue = this.createMuistuttajaIndexerQueue();
    streamHandler.node.addDependency(indexerQueue);
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["sqs:SendMessage"], resources: [indexerQueue.queueArn] }));
    streamHandler.addToRolePolicy(new PolicyStatement({ actions: ["ssm:GetParameter"], resources: ["*"] }));
    streamHandler.addEventSource(
      new SqsEventSource(indexerQueue, { batchSize: 100, maxConcurrency: 10, maxBatchingWindow: Duration.seconds(5) })
    );
    return streamHandler;
  }

  private async createBackendLambda(
    commonEnvironmentVariables: Record<string, string>,
    personSearchUpdaterLambda: NodejsFunction,
    eventSQS: Queue,
    hyvaksymisEsitysSQS: Queue,
    asianhallintaSQS: Queue,
    kiinteistoSQS: Queue,
    suomifiSQS: Queue,
    pdfGeneratorLambda: NodejsFunction,
    isYllapitoBackend: boolean,
    suomifiLambda: NodejsFunction,
    vpc: IVpc
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
        EVENT_SQS_URL: eventSQS.queueUrl,
        EVENT_SQS_ARN: eventSQS.queueArn,
        HYVAKSYMISESITYS_SQS_URL: hyvaksymisEsitysSQS.queueUrl,
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
      logRetention: this.getLogRetention(),
      vpc,
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

      eventSQS.grantSendMessages(backendLambda);
      hyvaksymisEsitysSQS.grantSendMessages(backendLambda);
      asianhallintaSQS.grantSendMessages(backendLambda);
      kiinteistoSQS.grantSendMessages(backendLambda);
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
      allowUusiaPalautteitaUpdate.addCondition("ForAllValues:StringEquals", {
        "dynamodb:Attributes": ["oid", "uusiaPalautteita", "muistuttajat", "muutMuistuttajat"],
      });
      backendLambda.addToRolePolicy(allowUusiaPalautteitaUpdate);

      this.props.yllapitoBucket.grantReadWrite(backendLambda, "*/muistutukset/*");
      this.props.yllapitoBucket.grantReadWrite(backendLambda, "*/palautteet/*");
      this.props.yllapitoBucket.grantRead(backendLambda, "*/aloituskuulutus/*"); // Hyväksymisesitystä varten lukuoikeus
      this.props.yllapitoBucket.grantRead(backendLambda, "*/suunnittelu/*"); // Hyväksymisesitystä varten lukuoikeus
      this.props.yllapitoBucket.grantRead(backendLambda, "*/hyvaksymisesitys/*"); // Hyväksymisesitystä varten lukuoikeus
      this.props.yllapitoBucket.grantRead(backendLambda, "*/nahtavillaolo/*"); // Lausuntopyyntöjä  ja hyväksymisesitystä varten lukuoikeus
      this.props.yllapitoBucket.grantRead(backendLambda, "*/lausuntopyynto/*"); // Lausuntopyyntöjä varten lukuoikeus
      this.props.yllapitoBucket.grantRead(backendLambda, "*/lausuntopyynnon_taydennys/*"); // Lausuntopyynnön täydennyksiä varten lukuoikeus
      this.props.publicBucket.grantRead(backendLambda);
      this.grantInternalBucket(backendLambda, "cache/bankHolidays.json");
    }
    this.props.uploadBucket.grantPut(backendLambda);
    this.props.uploadBucket.grantReadWrite(backendLambda);
    suomifiSQS.grantSendMessages(backendLambda);
    suomifiLambda.grantInvoke(backendLambda);
    return backendLambda;
  }

  private async createAsianhallintaLambda(asianhallintaSQS: Queue, vpc: IVpc) {
    const asianhallintaLambda = new DockerImageFunction(this, "asianhallinta-lambda", {
      vpc,
      functionName: Config.asianhallintaLambdaName,
      code: DockerImageCode.fromEcr(Repository.fromRepositoryName(this, "ecr-asianhallinta", "hassu-asianhallinta"), {
        tagOrDigest: ASIANHALLINTA_LAMBDA_VERSION,
      }),
      environment: {
        PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: "error",
        YLLAPITO_TABLE_NAME: this.props.projektiTable.tableName,
        YLLAPITO_BUCKET_NAME: this.props.yllapitoBucket.bucketName,
        ENVIRONMENT: Config.env,
        TZ: "Europe/Helsinki",
      },
      memorySize: 1792,
      timeout: Duration.minutes(3),
      tracing: Tracing.ACTIVE,
      insightsVersion,
    });
    this.addPermissionsForMonitoring(asianhallintaLambda);
    asianhallintaLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
    asianhallintaSQS.grantConsumeMessages(asianhallintaLambda);
    asianhallintaLambda.addEventSource(new SqsEventSource(asianhallintaSQS, { maxConcurrency: 2 }));
    this.props.yllapitoBucket.grantRead(asianhallintaLambda);

    // Asianhallintalambdalle lupa päivittää projektille synkronoinnin tiloja
    const updateSynkronointiPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [this.props.projektiTable.tableArn],
      actions: ["dynamodb:GetItem", "dynamodb:UpdateItem"],
    });
    updateSynkronointiPolicy.addCondition("ForAllValues:StringEquals", { "dynamodb:Attributes": ["oid", "synkronoinnit"] });
    asianhallintaLambda.addToRolePolicy(updateSynkronointiPolicy);
    return asianhallintaLambda;
  }

  private getLogRetention() {
    return Config.isDeveloperEnvironment() ? RetentionDays.THREE_MONTHS : RetentionDays.SEVEN_YEARS;
  }

  private createKiinteistoLambda(kiinteistoSQS: Queue, vpc: IVpc) {
    const kiinteistoLambda = new NodejsFunction(this, "kiinteisto-lambda", {
      functionName: "hassu-kiinteisto-" + Config.env,
      runtime: lambdaRuntime,
      vpc,
      entry: `${__dirname}/../../backend/src/mml/kiinteistoHandler.ts`,
      handler: "handleEvent",
      memorySize: 1792,
      timeout: Duration.minutes(10),
      bundling: {
        sourceMap: false,
        minify: true,
        metafile: false,
        externalModules,
      },
      environment: {
        ENVIRONMENT: Config.env,
        INFRA_ENVIRONMENT: Config.infraEnvironment,
        TZ: "Europe/Helsinki",
        PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: "ERROR",
        TABLE_KIINTEISTONOMISTAJA: this.props.kiinteistonomistajaTable.tableName,
        TABLE_PROJEKTI: this.props.projektiTable.tableName,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
      logRetention: this.getLogRetention(),
    });
    kiinteistoLambda.node.addDependency(kiinteistoSQS);
    this.addPermissionsForMonitoring(kiinteistoLambda);
    kiinteistoLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
    kiinteistoSQS.grantConsumeMessages(kiinteistoLambda);
    kiinteistoLambda.addEventSource(new SqsEventSource(kiinteistoSQS, { maxConcurrency: 3 }));
    this.props.kiinteistonomistajaTable.grantFullAccess(kiinteistoLambda);
    const updateSynkronointiPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [this.props.projektiTable.tableArn],
      actions: ["dynamodb:UpdateItem"],
    });
    updateSynkronointiPolicy.addCondition("ForAnyValue:StringEquals", {
      "dynamodb:Attributes": ["muutOmistajat", "omistajat", "omistajahaku"],
    });
    kiinteistoLambda.addToRolePolicy(updateSynkronointiPolicy);
  }

  private createSuomiFiLambda(suomiFiSQS: Queue, vpc: IVpc, config: Config, pdfGeneratorLambda: NodejsFunction) {
    const suomiFiLambda = new NodejsFunction(this, "suomifi-lambda", {
      functionName: "hassu-suomifi-" + Config.env,
      runtime: lambdaRuntime,
      vpc,
      entry: `${__dirname}/../../backend/src/suomifi/suomifiHandler.ts`,
      handler: "handleEvent",
      memorySize: 1024,
      timeout: Duration.minutes(10),
      bundling: {
        sourceMap: false,
        minify: true,
        metafile: false,
        externalModules,
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [
              `${path.normalize(
                "./node_modules/.bin/copyfiles"
              )} -f -u 1 ${inputDir}/backend/src/suomifi/viranomaispalvelutwsinterface/Viranomaispalvelut* ${outputDir}`,
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
        ENVIRONMENT: Config.env,
        INFRA_ENVIRONMENT: Config.infraEnvironment,
        TZ: "Europe/Helsinki",
        PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL: "ERROR",
        TABLE_KIINTEISTONOMISTAJA: this.props.kiinteistonomistajaTable.tableName,
        TABLE_PROJEKTI_MUISTUTTAJA: this.props.projektiMuistuttajaTable.tableName,
        TABLE_PROJEKTI: this.props.projektiTable.tableName,
        FRONTEND_DOMAIN_NAME: config.frontendDomainName,
        LOG_LEVEL: Config.isDeveloperEnvironment() ? process.env.LAMBDA_LOG_LEVEL ?? "info" : "info",
        PDF_GENERATOR_LAMBDA_ARN: pdfGeneratorLambda.functionArn,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
      logRetention: this.getLogRetention(),
    });
    suomiFiLambda.node.addDependency(suomiFiSQS);
    this.addPermissionsForMonitoring(suomiFiLambda);
    suomiFiLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
    suomiFiSQS.grantConsumeMessages(suomiFiLambda);
    suomiFiLambda.addEventSource(new SqsEventSource(suomiFiSQS, { maxConcurrency: 5, batchSize: 1 }));
    this.props.kiinteistonomistajaTable.grantReadWriteData(suomiFiLambda);
    this.props.projektiMuistuttajaTable.grantReadWriteData(suomiFiLambda);
    this.props.projektiTable.grantReadData(suomiFiLambda);
    this.grantYllapitoBucketRead(suomiFiLambda);
    pdfGeneratorLambda.grantInvoke(suomiFiLambda);
    return suomiFiLambda;
  }

  private async createHyvaksymisEsitysAineistoLambda(
    commonEnvironmentVariables: Record<string, string>,
    hyvaksymisEsitysSqs: Queue
  ): Promise<NodejsFunction> {
    const frontendStackOutputs = await readFrontendStackOutputs(); // TODO mitä tämä tekee?
    const concurrency = 10;
    const importer = new NodejsFunction(this, "HyvaksymisEsitysAineistoHandlerLambda", {
      functionName: "hassu-hyvaksymisesitys-aineisto-handler-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/HyvaksymisEsitys/aineistoHandling/aineistoHandler.ts`,
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
        HYVAKSYMISESITYS_SQS_URL: hyvaksymisEsitysSqs.queueUrl,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(importer);

    this.props.yllapitoBucket.grantReadWrite(importer);

    importer.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
    if (frontendStackOutputs?.CloudfrontDistributionId) {
      importer.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:CreateInvalidation"],
          resources: ["arn:aws:cloudfront::" + this.account + ":distribution/" + frontendStackOutputs?.CloudfrontDistributionId],
        })
      );
    }

    const eventSource = new SqsEventSource(hyvaksymisEsitysSqs, { batchSize: 1, maxConcurrency: concurrency });
    importer.addEventSource(eventSource);
    hyvaksymisEsitysSqs.grantSendMessages(importer);
    return importer;
  }

  private grantInternalBucket(func: NodejsFunction, pattern?: string) {
    func.addEnvironment("INTERNAL_BUCKET_NAME", this.props.internalBucket.bucketName);
    this.props.internalBucket.grantReadWrite(func, pattern);
  }

  private grantYllapitoBucketRead(func: NodejsFunction) {
    func.addEnvironment("YLLAPITO_BUCKET_NAME", this.props.yllapitoBucket.bucketName);
    this.props.yllapitoBucket.grantRead(func);
  }

  private addPermissionsForMonitoring(func: NodejsFunction) {
    func.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLambdaInsightsExecutionRolePolicy"));
    func.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"));
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
      environment: {
        FRONTEND_DOMAIN_NAME: config.frontendDomainName,
        NODE_OPTIONS: "--enable-source-maps",
        LOG_LEVEL: Config.isDeveloperEnvironment() ? process.env.LAMBDA_LOG_LEVEL ?? "info" : "info",
        ENVIRONMENT: Config.env,
        INFRA_ENVIRONMENT: Config.infraEnvironment,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(pdfGeneratorLambda);
    pdfGeneratorLambda.addToRolePolicy(new PolicyStatement({ effect: Effect.ALLOW, actions: ["ssm:GetParameter"], resources: ["*"] })); // listKirjaamoOsoitteet requires this
    this.grantInternalBucket(pdfGeneratorLambda); // Vapaapäivien cachetusta varten
    this.grantYllapitoBucketRead(pdfGeneratorLambda); // Logon lukemista varten pdf:iin
    new CfnOutput(this, "PdfGeneratorLambda", {
      value: pdfGeneratorLambda.functionArn,
    });
    return pdfGeneratorLambda;
  }

  private async getVpc(): Promise<IVpc> {
    const vpcName = await this.config.getParameterNow("HassuVpcName");
    assert(vpcName, "HassuVpcName SSM-parametri pitää olla olemassa");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
    return vpc;
  }

  private async createPersonSearchUpdaterLambda(commonEnvironmentVariables: Record<string, string>, vpc: IVpc) {
    const personSearchLambda = new NodejsFunction(this, "PersonSearchUpdaterLambda", {
      functionName: "hassu-personsearchupdater-" + Config.env,
      runtime: lambdaRuntime,
      vpc,
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
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(personSearchLambda);
    this.grantInternalBucket(personSearchLambda); // Käyttäjälistan cachetusta varten
    return personSearchLambda;
  }

  private async createSqsEventHandlerLambda(
    commonEnvironmentVariables: Record<string, string>,
    eventSQS: Queue,
    aineistoSQS: Queue,
    suomifiSQS: Queue
  ): Promise<NodejsFunction> {
    const frontendStackOutputs = await readFrontendStackOutputs();
    const concurrency = 10;
    const importer = new NodejsFunction(this, "SqsEventHandlerLambda", {
      functionName: "hassu-sqs-event-handler-" + Config.env,
      runtime: lambdaRuntime,
      entry: `${__dirname}/../../backend/src/sqsEvents/sqsEventHandlerLambda.ts`,
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
        EVENT_SQS_URL: eventSQS.queueUrl,
        EVENT_SQS_ARN: eventSQS.queueArn,
        CLOUDFRONT_DISTRIBUTION_ID: frontendStackOutputs?.CloudfrontDistributionId,
      },
      tracing: Tracing.ACTIVE,
      insightsVersion,
      layers: this.layers,
      logRetention: this.getLogRetention(),
    });
    this.addPermissionsForMonitoring(importer);

    this.props.yllapitoBucket.grantReadWrite(importer);
    this.props.publicBucket.grantReadWrite(importer);
    this.props.uploadBucket.grantRead(importer);

    importer.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
    if (frontendStackOutputs?.CloudfrontDistributionId) {
      importer.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:CreateInvalidation"],
          resources: ["arn:aws:cloudfront::" + this.account + ":distribution/" + frontendStackOutputs?.CloudfrontDistributionId],
        })
      );
    }

    const eventSource = new SqsEventSource(eventSQS, { batchSize: 1, maxConcurrency: concurrency });
    importer.addEventSource(eventSource);
    importer.addEventSource(new SqsEventSource(aineistoSQS, { batchSize: 1, maxConcurrency: concurrency }));
    eventSQS.grantSendMessages(importer);
    suomifiSQS.grantSendMessages(importer);
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
      logRetention: this.getLogRetention(),
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
        const operation: OperationConfig = apiConfig[operationName as keyof ApiConfig];
        if (!!operation.isYllapitoOperation == isYllapitoBackend) {
          const props = {
            typeName: operation.operationType === OperationType.Query ? "Query" : "Mutation",
            fieldName: operation.name,
            responseMappingTemplate: appsync.MappingTemplate.fromFile(`${__dirname}/template/response.vtl`),
          };
          lambdaDataSource.createResolver(operation.name, props);
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
      this.props.kiinteistonomistajaTable.grantFullAccess(backendFn);
      backendFn.addEnvironment("TABLE_KIINTEISTONOMISTAJA", this.props.kiinteistonomistajaTable.tableName);
      this.props.projektiMuistuttajaTable.grantFullAccess(backendFn);
    } else {
      projektiTable.grantReadData(backendFn);
      this.props.projektiMuistuttajaTable.grantWriteData(backendFn);
    }
    backendFn.addEnvironment("TABLE_PROJEKTI_MUISTUTTAJA", this.props.projektiMuistuttajaTable.tableName);
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

      FRONTEND_DOMAIN_NAME: config.frontendDomainName,
      FRONTEND_API_DOMAIN_NAME: config.frontendApiDomainName,

      UPLOAD_BUCKET_NAME: this.props.uploadBucket.bucketName,
      YLLAPITO_BUCKET_NAME: this.props.yllapitoBucket.bucketName,
      PUBLIC_BUCKET_NAME: this.props.publicBucket.bucketName,
      LOG_LEVEL: Config.isDeveloperEnvironment() ? process.env.LAMBDA_LOG_LEVEL ?? "info" : "info",
    };
    return variables;
  }

  private createHyvaksymisEsitysAineistoQueue() {
    return new Queue(this, "HyvaksymisEsitysQueue", {
      queueName: "hyvaksymisesitys-queue-" + Config.env,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
  }

  private createAineistoImporterQueue() {
    return new Queue(this, "AineistoImporter", {
      queueName: "aineisto-importer-" + Config.env + ".fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
  }

  private createEventQueue() {
    return new Queue(this, "EventQueue", {
      queueName: "event-queue-" + Config.env + ".fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
  }

  private createKiinteistoQueue() {
    const queue = new Queue(this, "KiinteistoQueue", {
      queueName: "kiinteisto-queue-" + Config.env,
      visibilityTimeout: Duration.minutes(12),
      encryption: QueueEncryption.KMS_MANAGED,
      retentionPeriod: Duration.minutes(10),
    });
    new ssm.StringParameter(this, "KiinteistoSQSUrl", {
      description: "Generated KiinteistoSQSUrl",
      parameterName: "/" + Config.env + "/outputs/KiinteistoSQSUrl",
      stringValue: queue.queueUrl,
    });
    return queue;
  }

  private createSuomiFiQueue() {
    const queue = new Queue(this, "SuomiFiQueue", {
      queueName: "suomifi-queue-" + Config.env,
      visibilityTimeout: Duration.minutes(30),
      encryption: QueueEncryption.KMS_MANAGED,
      retentionPeriod: Duration.minutes(35),
    });
    new ssm.StringParameter(this, "SuomiFiSQSUrl", {
      description: "Generated SuomiFiSQSUrl",
      parameterName: "/" + Config.env + "/outputs/SuomiFiSQSUrl",
      stringValue: queue.queueUrl,
    });
    return queue;
  }

  private createIndexerQueue() {
    const queue = new Queue(this, "ProjektiIndexer", {
      queueName: "projekti-indexer-" + Config.env,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
    new ssm.StringParameter(this, "IndexerSQSUrl", {
      description: "Generated IndexerSQSUrl",
      parameterName: "/" + Config.env + "/outputs/IndexerSQSUrl",
      stringValue: queue.queueUrl,
    });
    return queue;
  }

  private createOmistajaIndexerQueue() {
    const queue = new Queue(this, "OmistajaIndexer", {
      queueName: "omistaja-indexer-" + Config.env,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
    new ssm.StringParameter(this, "OmistajaIndexerSQSUrl", {
      description: "Generated OmistajaIndexerSQSUrl",
      parameterName: "/" + Config.env + "/outputs/OmistajaIndexerSQSUrl",
      stringValue: queue.queueUrl,
    });
    return queue;
  }

  private createMuistuttajaIndexerQueue() {
    const queue = new Queue(this, "MuistuttajaIndexer", {
      queueName: "muistuttaja-indexer-" + Config.env,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
    new ssm.StringParameter(this, "MuistuttajaIndexerSQSUrl", {
      description: "Generated MuistuttajaIndexerSQSUrl",
      parameterName: "/" + Config.env + "/outputs/MuistuttajaIndexerSQSUrl",
      stringValue: queue.queueUrl,
    });
    return queue;
  }

  private createAsianhallintaSQS() {
    const queue = new Queue(this, "AsianhallintaSQS", {
      queueName: "asianhallinta-synchronizer-" + Config.env + ".fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: Duration.minutes(10),
      encryption: QueueEncryption.KMS_MANAGED,
    });
    new ssm.StringParameter(this, "AsianhallintaSQSUrl", {
      description: "Generated AsianhallintaSQSUrl",
      parameterName: "/" + Config.env + "/outputs/AsianhallintaSQSUrl",
      stringValue: queue.queueUrl,
    });
    this.asianhallintaQueue = queue; // TODO: Miksi??
    return queue;
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

  private createAndProvideSchedulerExecutionRole(
    eventSQS: Queue,
    aineistoSQS: Queue,
    hyvaksymisEsitysSQS: Queue,
    hyvaksymisEsitysAineistoHandlerLambda: NodejsFunction,
    ...backendLambdas: NodejsFunction[]
  ) {
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
              resources: [eventSQS.queueArn],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["sqs:SendMessage"],
              resources: [aineistoSQS.queueArn],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["sqs:SendMessage"],
              resources: [hyvaksymisEsitysSQS.queueArn],
            }),
          ],
        }),
      },
    });
    // TODO: jotain oikkia hyvaksymisEsitysAineistoHandlerLambda:lle ??
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
