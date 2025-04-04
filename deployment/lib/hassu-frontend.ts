import { Construct } from "constructs";
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  CfnPublicKey,
  Distribution,
  KeyGroup,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { Config } from "./config";
import { HttpOrigin, S3Origin, VpcOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Builder } from "@sls-next/lambda-at-edge";
import { NextJSLambdaEdge, Props } from "@sls-next/cdk-construct";
import { Code, IVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { CompositePrincipal, Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as fs from "fs";
import { EdgeFunction } from "aws-cdk-lib/aws-cloudfront/lib/experimental";
import { BlockPublicAccess, Bucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as logs from "aws-cdk-lib/aws-logs";
import {
  HassuSSMParameters,
  readAccountStackOutputs,
  readBackendStackOutputs,
  readDatabaseStackOutputs,
  readParametersForEnv,
  readPipelineStackOutputs,
  Region,
} from "./setupEnvironment";
import { IOriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront/lib/origin-access-identity";
import { createResourceGroup, getOpenSearchDomain } from "./common";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { BaseConfig } from "../../common/BaseConfig";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import { IVpc, Peer, Port, PrefixList, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import assert from "assert";
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, Protocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  OperatingSystemFamily,
  Secret
} from "aws-cdk-lib/aws-ecs";
import { Repository } from "aws-cdk-lib/aws-ecr";

// These should correspond to CfnOutputs produced by this stack
export type FrontendStackOutputs = {
  CloudfrontPrivateDNSName: string;
  CloudfrontDistributionId: string;
  FrontendPublicKeyIdOutput: string;
};

interface HassuFrontendStackProps {
  awsAccountId: string;
  internalBucket: Bucket;
  yllapitoBucket: Bucket;
  publicBucket: Bucket;
  projektiTable: Table;
  lyhytOsoiteTable: Table;
  eventQueue: Queue;
  asianhallintaQueue: Queue;
  nextJsImageTag: string;
}

const REGION = "us-east-1";

export const frontendStackName = "hassu-frontend-" + Config.env;

export class HassuFrontendStack extends Stack {
  private props: HassuFrontendStackProps;
  private cloudFrontOriginAccessIdentity!: string;

  private cloudFrontOriginAccessIdentityReportBucket!: string;

  constructor(scope: Construct, props: HassuFrontendStackProps) {
    super(scope, "frontend", {
      stackName: frontendStackName,
      terminationProtection: Config.getEnvConfig().terminationProtection,
      env: {
        account: props.awsAccountId,
        region: REGION,
      },
      tags: Config.tags,
    });
    this.props = props;
  }

  public async process(): Promise<void> {
    if (Config.isHotswap) {
      return;
    }

    const env = Config.env;
    const config = await Config.instance(this);

    const { AppSyncAPIKey, EventSqsUrl, HyvaksymisEsitysSqsUrl } = await readBackendStackOutputs();
    this.cloudFrontOriginAccessIdentity = (await readDatabaseStackOutputs()).CloudFrontOriginAccessIdentity || ""; // Empty default string for localstack deployment
    this.cloudFrontOriginAccessIdentityReportBucket = (await readPipelineStackOutputs()).CloudfrontOriginAccessIdentityReportBucket || ""; // Empty default string for localstack deployment

    const accountStackOutputs = await readAccountStackOutputs();
    const ssmParameters = await readParametersForEnv<HassuSSMParameters>(BaseConfig.infraEnvironment, Region.EU_WEST_1);

    const envVariables: NodeJS.ProcessEnv = {
      // Nämä muuttujat pitää välittää toteutukselle next.config.js:n kautta
      ENVIRONMENT: Config.env,
      FRONTEND_DOMAIN_NAME: config.frontendDomainName,
      FRONTEND_API_DOMAIN_NAME: config.frontendApiDomainName,
      REACT_APP_API_KEY: AppSyncAPIKey,
      TABLE_PROJEKTI: Config.projektiTableName,
      TABLE_LYHYTOSOITE: Config.lyhytOsoiteTableName,
      SEARCH_DOMAIN: accountStackOutputs.SearchDomainEndpointOutput,
      INTERNAL_BUCKET_NAME: Config.internalBucketName,
      EVENT_SQS_URL: EventSqsUrl,
      HYVAKSYMISESITYS_SQS_URL: HyvaksymisEsitysSqsUrl, // TODO: tarvitseeko tätä?? Miksi??
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      ASIANHALLINTA_SQS_URL: this.props.asianhallintaQueue.queueUrl,
      KEYCLOAK_CLIENT_ID: ssmParameters.KeycloakClientId,
      KEYCLOAK_DOMAIN: ssmParameters.KeycloakDomain,
    };
    if (BaseConfig.env !== "prod") {
      envVariables.PUBLIC_BUCKET_NAME = Config.publicBucketName;
      envVariables.YLLAPITO_BUCKET_NAME = Config.internalBucketName;
    }
    await new Builder(".", "./build", {
      enableHTTPCompression: true,
      minifyHandlers: true,
      args: ["build"],
      env: envVariables,
    }).build();

    const edgeFunctionRole = this.createEdgeFunctionRole();

    const frontendRequestFunction = this.createFrontendRequestFunction(
      env,
      config.basicAuthenticationUsername,
      config.basicAuthenticationPassword,
      edgeFunctionRole
    );

    const dmzProxyBehaviorWithLambda = HassuFrontendStack.createDmzProxyBehavior(config.dmzProxyEndpoint, frontendRequestFunction);

    const dmzProxyBehavior = HassuFrontendStack.createDmzProxyBehavior(config.dmzProxyEndpoint);
    const mmlApiKey = await config.getParameterNow("MmlApiKey");
    const apiEndpoint = await config.getParameterNow("ApiEndpoint");
    const apiBehavior = this.createApiBehavior(apiEndpoint, mmlApiKey, env);
    const publicGraphqlBehavior = this.createPublicGraphqlDmzProxyBehavior(
      config.dmzProxyEndpoint,
      env,
      edgeFunctionRole,
      frontendRequestFunction
    );
    const behaviours: Record<string, BehaviorOptions> = await this.createDistributionProperties(
      env,
      config,
      dmzProxyBehaviorWithLambda,
      dmzProxyBehavior,
      apiBehavior,
      publicGraphqlBehavior,
      edgeFunctionRole,
      frontendRequestFunction
    );

    let domain:
      | {
          hostedZone?: IHostedZone;
          certificate: ICertificate;
          domainNames: string[];
        }
      | undefined;
    if (config.cloudfrontCertificateArn) {
      domain = {
        certificate: acm.Certificate.fromCertificateArn(this, "certificate", config.cloudfrontCertificateArn),
        domainNames: config.getDomainNames(),
      };
    }

    const id = `NextJsApp-${env}`;

    const logBucket = new Bucket(this, "CloudfrontLogs", {
      bucketName: `hassu-${Config.env}-cloudfront`,
      versioned: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ enabled: true, expiration: Duration.days(366 / 2) }],
      enforceSSL: true,
    });

    let cachePolicies: Partial<Props>;
    const staticsCachePolicyName = "NextJsAppStaticsCache";
    const imageCachePolicyName = "NextJsAppImageCache";
    const lambdaCachePolicyName = "NextJsAppLambdaCache";
    if (env == "dev" || env == "prod") {
      // Cache policyt luodaan vain kerran per account
      cachePolicies = {
        cachePolicyName: {
          staticsCache: staticsCachePolicyName,
          imageCache: imageCachePolicyName,
          lambdaCache: lambdaCachePolicyName,
        },
      };
    } else {
      // Käytä jo accountissa olevia cache policyjä
      cachePolicies = {
        nextStaticsCachePolicy: CachePolicy.fromCachePolicyId(
          this,
          "nextStaticsCachePolicy",
          Fn.importValue("nextStaticsCachePolicyId")
        ) as CachePolicy,
        nextImageCachePolicy: CachePolicy.fromCachePolicyId(
          this,
          "nextImageCachePolicy",
          Fn.importValue("nextImageCachePolicyId")
        ) as CachePolicy,
        nextLambdaCachePolicy: CachePolicy.fromCachePolicyId(
          this,
          "nextLambdaCachePolicy",
          Fn.importValue("nextLambdaCachePolicyId")
        ) as CachePolicy,
      };
    }

    let webAclId: string | undefined;
    if (Config.getEnvConfig().waf) {
      webAclId = Fn.importValue("frontendWAFArn");
    }

    let edgeLambdas: { functionVersion: IVersion; eventType: LambdaEdgeEventType }[] = [];
    if (frontendRequestFunction) {
      edgeLambdas = [{ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }];
    }
    const nextJSLambdaEdge = new NextJSLambdaEdge(this, id, {
      ...cachePolicies,
      serverlessBuildOutDir: "./build",
      runtime: Runtime.NODEJS_18_X,
      env: { region: "us-east-1" },
      withLogging: true,
      name: {
        apiLambda: `${id}ApiV2`,
        defaultLambda: `Fn${id}`,
        imageLambda: `${id}Image`,
      },
      behaviours,
      domain,
      defaultBehavior: {
        edgeLambdas,
      },
      cloudfrontProps: {
        priceClass: PriceClass.PRICE_CLASS_100,
        logBucket,
        webAclId,
        errorResponses: this.getErrorResponsesForCloudFront(),
      },
      invalidationPaths: ["/*"],
    });

    // Rajoitetaan rumasti vain deviin uusi prosessi tässä
    // Palautetaan tässä vaiheessa taski, jotta helpompi luvittaa se (kauheus poistuu kun vanhasta eroon)
    let ecsTask: FargateTaskDefinition | null = null
    if (Config.env == "dev") {
      const { SearchDomainEndpointOutput } = accountStackOutputs
      ecsTask = await this.newProcess(config, edgeLambdas, behaviours, logBucket, webAclId, ssmParameters, {EventSqsUrl, HyvaksymisEsitysSqsUrl, SearchDomainEndpointOutput});
    }

    this.configureNextJSAWSPermissions(nextJSLambdaEdge.edgeLambdaRole);
    HassuFrontendStack.configureNextJSRequestHeaders(nextJSLambdaEdge);

    const searchDomain = await getOpenSearchDomain(this, accountStackOutputs);
    const nextApiLambda = nextJSLambdaEdge.nextApiLambda;
    if (nextApiLambda) {
      searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", nextApiLambda);
      const environmentsBlacklistedFromTimeShift = ["prod", "training"];
      const isEnvironmentBlacklistedFromTimeShift = environmentsBlacklistedFromTimeShift.includes(env);
      if (!isEnvironmentBlacklistedFromTimeShift) {
        this.props.projektiTable.grantReadWriteData(nextApiLambda);
        this.props.eventQueue.grantSendMessages(nextApiLambda);
        // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
        this.props.asianhallintaQueue.grantSendMessages(nextApiLambda);
        this.props.yllapitoBucket.grantReadWrite(nextApiLambda);
        this.props.publicBucket.grantReadWrite(nextApiLambda);
      }
      this.props.lyhytOsoiteTable.grantReadData(nextApiLambda);
    }

    if (ecsTask) {
      searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", ecsTask.taskRole);
      // Logic not needed as long as we run only in dev but keep it here as reminder when expanding to elsewhere
      const environmentsBlacklistedFromTimeShift = ["prod", "training"];
      const isEnvironmentBlacklistedFromTimeShift = environmentsBlacklistedFromTimeShift.includes(env);
      if (!isEnvironmentBlacklistedFromTimeShift) {
        this.props.projektiTable.grantReadWriteData(ecsTask.taskRole);
        this.props.eventQueue.grantSendMessages(ecsTask.taskRole);
        // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
        this.props.asianhallintaQueue.grantSendMessages(ecsTask.taskRole);
        this.props.yllapitoBucket.grantReadWrite(ecsTask.taskRole);
        this.props.publicBucket.grantReadWrite(ecsTask.taskRole);
      }
      this.props.lyhytOsoiteTable.grantReadData(ecsTask.taskRole);
      this.props.internalBucket.grantReadWrite(ecsTask.taskRole); // granted to lambda in this.configureNextJSAWSPermissions(nextJSLambdaEdge.edgeLambdaRole);
    }

    if (env == "dev" || env == "prod") {
      new CfnOutput(this, "nextStaticsCachePolicyId", {
        value: nextJSLambdaEdge.nextStaticsCachePolicy.cachePolicyId || "",
        exportName: "nextStaticsCachePolicyId",
      });
      new CfnOutput(this, "nextImageCachePolicyId", {
        value: nextJSLambdaEdge.nextImageCachePolicy.cachePolicyId || "",
        exportName: "nextImageCachePolicyId",
      });
      new CfnOutput(this, "nextLambdaCachePolicyId", {
        value: nextJSLambdaEdge.nextLambdaCachePolicy.cachePolicyId || "",
        exportName: "nextLambdaCachePolicyId",
      });
    }

    const distribution: cloudfront.Distribution = nextJSLambdaEdge.distribution;

    new CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: distribution.distributionDomainName || "",
    });
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: distribution.distributionId || "",
    });
    createResourceGroup(this); // Ympäristön valitsemiseen esim. CloudWatchissa
  }

  private async getVpc(config: Config): Promise<IVpc> {
    const vpcName = await config.getParameterNow("HassuVpcName");
    assert(vpcName, "HassuVpcName SSM-parametri pitää olla olemassa");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
    return vpc;
  }

  private async newProcess(
    config: Config,
    edgeLambdas: cloudfront.EdgeLambda[],
    behaviours: Record<string, cloudfront.BehaviorOptions>,
    logBucket: Bucket,
    webAclId: string | undefined,
    ssmParameters: HassuSSMParameters,
    stackOutputs: Record<string, string>
  ): Promise<FargateTaskDefinition> {
    // VPC
    const vpc = await this.getVpc(config);

    // ALB
    const albSecurityGroup = new SecurityGroup(this, "ALBSecurityGroup", {
      vpc,
      description: "Security group for ALB",
      allowAllOutbound: true
    })
    
    const cfPrefixList = PrefixList.fromPrefixListId(
      this, 
      "Cloudfront PrefixList",
      "com.amazonaws.global.cloudfront.origin-facing"
    );

    // TODO the prefixList might need some adjustment or different approach all together
    albSecurityGroup.addIngressRule(
      Peer.prefixList(cfPrefixList.prefixListId),
      Port.tcp(80),
      "Allow Cloudfront access to ALB"
    );

    const alb = new ApplicationLoadBalancer(this, "NextjsALB", {
      vpc,
      internetFacing: false,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS
      },
      http2Enabled: true,
      securityGroup: albSecurityGroup
    })

    // Parameters
    // apinoitu next.config.js
    let version = process.env.CODEBUILD_SOURCE_VERSION || "";
    try {
      let buffer = fs.readFileSync(__dirname + "/.version");
      if (buffer) {
        version = buffer.toString("utf8");
      }
    } catch (e) {
      // Ignore
    }

    // Runtime env & secrets
    const containerEnv: { [key: string]: string } = {
      NEXT_PUBLIC_VERSION: version,
      NEXT_PUBLIC_ENVIRONMENT: Config.env,
      NEXT_PUBLIC_VAYLA_EXTRANET_URL: process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL || "", // asetetaan deployment/lib/hassu-pipelines.ts
      NEXT_PUBLIC_VELHO_BASE_URL: process.env.NEXT_PUBLIC_VELHO_BASE_URL || "", // sama kuin ^^
      NEXT_PUBLIC_AJANSIIRTO_SALLITTU: ssmParameters.AjansiirtoSallittu,
      INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
      ASIANHALLINTA_SQS_URL: this.props.asianhallintaQueue.queueUrl,
      TABLE_PROJEKTI: Config.projektiTableName,
      TABLE_LYHYTOSOITE: Config.lyhytOsoiteTableName,
      INTERNAL_BUCKET_NAME: Config.internalBucketName,
      FRONTEND_DOMAIN_NAME: config.frontendDomainName,
      REACT_APP_API_URL: `https://${config.frontendApiDomainName}/graphql`,
      KEYCLOAK_CLIENT_ID: ssmParameters.KeycloakClientId,
      KEYCLOAK_DOMAIN: ssmParameters.KeycloakDomain,
      VELHO_API_URL: ssmParameters.VelhoApiUrl,
      VELHO_AUTH_URL: ssmParameters.VelhoAuthenticationUrl,
      EVENT_SQS_URL: stackOutputs.EventSqsUrl,
      HYVAKSYMISESITYS_SQS_URL: stackOutputs.HyvaksymisEsitysSqsUrl,
      SEARCH_DOMAIN: stackOutputs.SearchDomainEndpointOutput,
    }

    if (Config.env !== "prod") {
      containerEnv.PUBLIC_BUCKET_NAME = Config.publicBucketName;
      containerEnv.YLLAPITO_BUCKET_NAME = Config.internalBucketName;
    }

    // Secrets 
    const velhoUsername = ssm.StringParameter.fromSecureStringParameterAttributes(this, "VelhoUsername", {
      parameterName: `/${Config.env}/VelhoUsername`,
    });

    const velhoPassword = ssm.StringParameter.fromSecureStringParameterAttributes(this, "VelhoPassword", {
      parameterName: `/${Config.env}/VelhoPassword`,
    });

    const appSyncAPIKey = ssm.StringParameter.fromStringParameterAttributes(this, "AppSyncAPIKey", {
      parameterName: `/${Config.env}/output/AppSyncAPIKey`,
    });

    const containerSecrets: { [key: string]: Secret } = {
      VELHO_USERNAME: Secret.fromSsmParameter(velhoUsername),
      VELHO_PASSWORD: Secret.fromSsmParameter(velhoPassword),
      REACT_APP_API_KEY: Secret.fromSsmParameter(appSyncAPIKey)
    }

    // ECS + Fargate
    const cluster = new Cluster(this, "ECSCluster", {
      vpc,
      clusterName: "Next.js Cluster"
    })

    const logGroup = new logs.LogGroup(this, "EcsLogGroup", {
      logGroupName: `ecs/nextjs-${Config.env}`,
      retention: logs.RetentionDays.SIX_MONTHS // TODO tähän oikea politiikka
    })

    const repository = Repository.fromRepositoryName(this, "NextjsRepo", "hassu-nextjs");

    const ecsTask = new FargateTaskDefinition(this, "EcsTask", {
      // TODO seuraa onko tämä riittävä vai pitääkö tuunata suuntaan tai toiseen
      memoryLimitMiB: 2048,
      cpu: 1024, // = 1 vCPU
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.X86_64,
      },
    });

    ecsTask.addContainer("NextJsContainer", {
      image: ContainerImage.fromEcrRepository(repository, this.props.nextJsImageTag),
      containerName: "nextJsApp",
      portMappings: [{ containerPort: 3000, hostPort: 80 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "nextJsApp",
        logGroup: logGroup
      }),
      environment: containerEnv,
      secrets: containerSecrets
    });

    const ecsSecurityGroup = new SecurityGroup(this, "ECSSecurityGroup", {
      vpc,
      allowAllOutbound: true
    });

    // Allow ALB to reach ECS
    ecsSecurityGroup.addIngressRule(albSecurityGroup, Port.tcp(80))

    const fargateService = new FargateService(this, "nextJsAppFargateService", {
      cluster,
      taskDefinition: ecsTask,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSecurityGroup],
    });

    const fargateTargetGroup = new ApplicationTargetGroup(this, "nextJsAppTargetGroup", {
      vpc,
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targets: [fargateService],
      healthCheck: {
        path: "/",
        protocol: Protocol.HTTP,
        port: "3000",
      },
    });

    alb.addListener("Listener", {
      port: 80,
      defaultTargetGroups: [fargateTargetGroup]
    })

    // Cloudfront
    const distribution = new Distribution(this, "CloudfrontDistribution", {
      defaultBehavior: { 
        origin: VpcOrigin.withApplicationLoadBalancer(alb, {
          httpPort: 80,
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
        }),
        edgeLambdas,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED, // TODO selvitä mitä voidaan cachettaa.
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: behaviours,
      priceClass: PriceClass.PRICE_CLASS_100,
      logBucket,
      webAclId,
      errorResponses: this.getErrorResponsesForCloudFront(),
    });

    new CfnOutput(this, "CfnPrivateDNSName", {
      value: distribution.distributionDomainName || "",
    });
    new CfnOutput(this, "CfnDistributionId", {
      value: distribution.distributionId || "",
    });

    return ecsTask
  }

  private getErrorResponsesForCloudFront() {
    return [{ responseHttpStatus: 404, ttl: Duration.seconds(10), httpStatus: 404, responsePagePath: "/404" }];
  }

  private configureNextJSAWSPermissions(lambdaRole: Role) {
    lambdaRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:*", "xray:*", "ssm:GetParameter"],
        resources: ["*"],
      })
    );

    lambdaRole.grantPassRole(new ServicePrincipal("logger.cloudfront.amazonaws.com"));

    this.props.internalBucket.grantReadWrite(lambdaRole);
  }

  private static configureNextJSRequestHeaders(nextJSLambdaEdge: NextJSLambdaEdge) {
    // Enable forwarding the headers to the nextjs API lambda to get the authorization header
    // eslint-disable-next-line
    const additionalBehaviors = (nextJSLambdaEdge.distribution as any).additionalBehaviors;
    for (const additionalBehavior of additionalBehaviors) {
      if (additionalBehavior.props.pathPattern == "api/*") {
        additionalBehavior.props.originRequestPolicy = OriginRequestPolicy.ALL_VIEWER;
      }
    }
  }

  private createFrontendRequestFunction(
    env: string,
    basicAuthenticationUsername: string,
    basicAuthenticationPassword: string,
    role: Role
  ): EdgeFunction | undefined {
    if (env !== "prod") {
      const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequest.js`).toString("utf-8");
      const functionCode = Fn.sub(sourceCode, {
        BASIC_USERNAME: basicAuthenticationUsername,
        BASIC_PASSWORD: basicAuthenticationPassword,
        ENVIRONMENT: Config.env,
      });
      return new cloudfront.experimental.EdgeFunction(this, "frontendRequestFunction", {
        runtime: Runtime.NODEJS_18_X,
        functionName: "frontendRequestFunction" + env,
        code: Code.fromInline(functionCode),
        handler: "index.handler",
        role,
      });
    }
  }

  private createSuomifiRequestFunction(env: string, role: Role): EdgeFunction {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/suomifiHeader.js`).toString("utf-8");
    return new cloudfront.experimental.EdgeFunction(this, "suomifiRequestFunction", {
      runtime: Runtime.NODEJS_18_X,
      functionName: "suomifiRequestFunction" + env,
      code: Code.fromInline(sourceCode),
      handler: "index.handler",
      role,
    });
  }

  private createEdgeFunctionRole() {
    return new Role(this, "edgeFunctionRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com"),
        new ServicePrincipal("edgelambda.amazonaws.com"),
        new ServicePrincipal("logger.cloudfront.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(this, "NextApiLambdaPolicy", "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"),
      ],
      inlinePolicies: {
        xray: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["xray:*"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });
  }

  private createTiedostotOriginResponseFunction(env: string, role: Role): EdgeFunction {
    const functionCode = fs.readFileSync(`${__dirname}/lambda/tiedostotOriginResponse.js`).toString("utf-8");

    return new cloudfront.experimental.EdgeFunction(this, "tiedostotOriginResponseFunction", {
      runtime: Runtime.NODEJS_18_X,
      functionName: "tiedostotOriginResponseFunction" + env,
      code: Code.fromInline(functionCode),
      handler: "index.handler",
      role,
    });
  }

  private async createDistributionProperties(
    env: string,
    config: Config,
    dmzProxyBehaviorWithLambda: BehaviorOptions,
    dmzProxyBehavior: BehaviorOptions,
    apiBehavior: BehaviorOptions,
    publicGraphqlBehavior: BehaviorOptions,
    edgeFunctionRole: Role,
    frontendRequestFunction?: EdgeFunction
  ): Promise<Record<string, BehaviorOptions>> {
    const { keyGroups, originAccessIdentity, originAccessIdentityReportBucket } = await this.createTrustedKeyGroupsAndOAI(config);
    const publicBucketBehaviour = await this.createPublicBucketBehavior(
      env,
      edgeFunctionRole,
      frontendRequestFunction,
      originAccessIdentity
    );
    const props: Record<string, BehaviorOptions> = {
      "/oauth2/*": dmzProxyBehaviorWithLambda,
      "/jwtclaims": dmzProxyBehaviorWithLambda,
      "/graphql": publicGraphqlBehavior,
      "/huoltokatko/*": publicBucketBehaviour,
      "/tiedostot/*": publicBucketBehaviour,
      "/yllapito/tiedostot/*": await this.createPrivateBucketBehavior(
        "yllapitoBucket",
        Config.yllapitoBucketName,
        keyGroups,
        frontendRequestFunction,
        originAccessIdentity
      ),
      "/yllapito/graphql": dmzProxyBehaviorWithLambda,
      "/yllapito/kirjaudu": dmzProxyBehaviorWithLambda,
      "/keycloak/*": dmzProxyBehavior,
      "/hassu/*": apiBehavior,
    };
    if (Config.env == "dev") {
      props["/report/*"] = await this.createPrivateBucketBehavior(
        "reportBucket",
        Config.reportBucketName,
        keyGroups,
        frontendRequestFunction,
        originAccessIdentityReportBucket
      );
    }
    return props;
  }

  private static createDmzProxyBehavior(dmzProxyEndpoint: string, frontendRequestFunction?: cloudfront.experimental.EdgeFunction) {
    const dmzBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzProxyEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1, OriginSslPolicy.SSL_V3],
      }),
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      edgeLambdas: frontendRequestFunction
        ? [{ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }]
        : [],
    };

    return dmzBehavior;
  }

  private createPublicGraphqlDmzProxyBehavior(
    dmzProxyEndpoint: string,
    env: string,
    role: Role,
    frontendRequestFunction?: cloudfront.experimental.EdgeFunction
  ) {
    const suomifiLambda = this.createSuomifiRequestFunction(env, role);
    const edgeLambdas: cloudfront.EdgeLambda[] = [
      { functionVersion: suomifiLambda.currentVersion, eventType: LambdaEdgeEventType.ORIGIN_REQUEST },
    ];
    if (frontendRequestFunction) {
      edgeLambdas.push({ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST });
    }
    const graphqlBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzProxyEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1, OriginSslPolicy.SSL_V3],
      }),
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      edgeLambdas,
    };
    return graphqlBehavior;
  }

  private createApiBehavior(apiEndpoint: string, apiKey: string, env: string) {
    const originRequestPolicy = new OriginRequestPolicy(this, "MML" + env, {
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList("origin"),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      originRequestPolicyName: "MMLPolicy-" + env,
    });
    const apiBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(apiEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1, OriginSslPolicy.SSL_V3],
        customHeaders: { "x-api-key": apiKey },
      }),
      cachePolicy: new CachePolicy(this, "MML-cache-policy-" + env, {
        queryStringBehavior: { behavior: "whitelist", queryStrings: ["limit", "bbox", "filter-lang", "crs", "bbox-crs", "next"] },
        cachePolicyName: "MMLCachePolicy-" + env,
      }),
      originRequestPolicy,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    return apiBehavior;
  }

  private async createPublicBucketBehavior(
    env: string,
    role: Role,
    frontendRequestFunction?: EdgeFunction,
    originAccessIdentity?: IOriginAccessIdentity
  ): Promise<BehaviorOptions> {
    const tiedostotOriginResponseFunction = this.createTiedostotOriginResponseFunction(env, role);
    const edgeLambdas = [
      {
        functionVersion: tiedostotOriginResponseFunction.currentVersion,
        eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
      },
    ];
    if (!Config.isDeveloperEnvironment() && frontendRequestFunction) {
      edgeLambdas.push({ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST });
    }
    return {
      origin: new S3Origin(
        Bucket.fromBucketAttributes(this, "tiedostotBucketOrigin", {
          region: "eu-west-1",
          bucketName: Config.publicBucketName,
        }),
        {
          originAccessIdentity,
        }
      ),
      compress: true,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
      edgeLambdas,
    };
  }

  private async createPrivateBucketBehavior(
    name: string,
    bucketName: string,
    keyGroups: KeyGroup[],
    frontendRequestFunction?: EdgeFunction,
    originAccessIdentity?: IOriginAccessIdentity
  ): Promise<BehaviorOptions> {
    return {
      origin: new S3Origin(
        Bucket.fromBucketAttributes(this, name + "Origin", {
          region: "eu-west-1",
          bucketName,
        }),
        {
          originAccessIdentity,
        }
      ),
      compress: true,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
      trustedKeyGroups: keyGroups,
      edgeLambdas:
        Config.isDeveloperEnvironment() || !frontendRequestFunction
          ? []
          : [{ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }],
    };
  }

  private async createTrustedKeyGroupsAndOAI(config: Config): Promise<{
    originAccessIdentity: IOriginAccessIdentity | undefined;
    keyGroups: KeyGroup[];
    originAccessIdentityReportBucket: IOriginAccessIdentity | undefined;
  }> {
    let keyGroups: KeyGroup[];
    let originAccessIdentity: IOriginAccessIdentity | undefined;
    let originAccessIdentityReportBucket: IOriginAccessIdentity | undefined;

    if (Config.isLocalStack()) {
      keyGroups = [];
      originAccessIdentity = undefined;
      originAccessIdentityReportBucket = undefined;
    } else {
      const publicKey = new cloudfront.PublicKey(this, "FrontendPublicKey", {
        publicKeyName: "FrontendPublicKey" + Config.env,
        encodedKey: await config.getGlobalSecureInfraParameter("FrontendPublicKey"),
      });
      const cfnKey: CfnPublicKey = publicKey.node.defaultChild as CfnPublicKey;
      type Writeable<T> = { -readonly [P in keyof T]: T[P] };
      const cfnKeyConfig = cfnKey.publicKeyConfig as Writeable<CfnPublicKey.PublicKeyConfigProperty>;
      cfnKeyConfig.callerReference = cfnKeyConfig.callerReference + Config.env;
      keyGroups = [
        new cloudfront.KeyGroup(this, "FrontendKeyGroup", {
          keyGroupName: "FrontendKeyGroup" + Config.env,
          items: [publicKey],
        }),
      ];
      new ssm.StringParameter(this, "FrontendPublicKeyId", {
        description: "Generated FrontendPublicKeyId",
        parameterName: "/" + Config.env + "/outputs/FrontendPublicKeyId",
        stringValue: publicKey.publicKeyId,
      });
      new CfnOutput(this, "FrontendPublicKeyIdOutput", {
        value: publicKey.publicKeyId || "",
      });

      originAccessIdentity = OriginAccessIdentity.fromOriginAccessIdentityId(
        this,
        "CloudfrontOriginAccessIdentity" + Config.env,
        this.cloudFrontOriginAccessIdentity
      );

      if (Config.env == "dev") {
        originAccessIdentityReportBucket = OriginAccessIdentity.fromOriginAccessIdentityId(
          this,
          "CloudfrontOriginAccessIdentityReportBucket",
          this.cloudFrontOriginAccessIdentityReportBucket
        );
      }
    }

    return { keyGroups, originAccessIdentity, originAccessIdentityReportBucket };
  }
}
