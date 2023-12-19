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
  KeyGroup,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { Config } from "./config";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Builder } from "@sls-next/lambda-at-edge";
import { NextJSLambdaEdge, Props } from "@sls-next/cdk-construct";
import { Code, IVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { CompositePrincipal, Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as fs from "fs";
import { EdgeFunction } from "aws-cdk-lib/aws-cloudfront/lib/experimental";
import { BlockPublicAccess, Bucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  HassuSSMParameters,
  readAccountStackOutputs,
  readBackendStackOutputs,
  readDatabaseStackOutputs,
  readParametersForEnv,
  readPipelineStackOutputs,
  Region
} from "./setupEnvironment";
import { IOriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront/lib/origin-access-identity";
import { createResourceGroup, getOpenSearchDomain } from "./common";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { BaseConfig } from "../../common/BaseConfig";
import { IHostedZone } from "aws-cdk-lib/aws-route53";

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

    const { AppSyncAPIKey, EventSqsUrl } = await readBackendStackOutputs();
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
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      ASIANHALLINTA_SQS_URL: this.props.asianhallintaQueue.queueUrl,
      SUOMI_FI_COGNITO_DOMAIN: ssmParameters.SuomifiCognitoDomain,
      SUOMI_FI_USERPOOL_CLIENT_ID: ssmParameters.SuomifiUserPoolClientId,
      KEYCLOAK_CLIENT_ID: ssmParameters.KeycloakClientId,
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
    const apiBehavior = HassuFrontendStack.createApiBehavior(apiEndpoint, mmlApiKey);
    
    const behaviours: Record<string, BehaviorOptions> = await this.createDistributionProperties(
      env,
      config,
      dmzProxyBehaviorWithLambda,
      dmzProxyBehavior,
      apiBehavior,
      edgeFunctionRole,
      frontendRequestFunction
    );

    let domain: {
      hostedZone?: IHostedZone;
      certificate: ICertificate;
      domainNames: string[];
    } | undefined;
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

    let webAclId;
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
    this.configureNextJSAWSPermissions(nextJSLambdaEdge);
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

  private getErrorResponsesForCloudFront() {
    return [{ responseHttpStatus: 404, ttl: Duration.seconds(10), httpStatus: 404, responsePagePath: "/404" }];
  }

  private configureNextJSAWSPermissions(nextJSLambdaEdge: NextJSLambdaEdge) {
    nextJSLambdaEdge.edgeLambdaRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:*", "xray:*", "ssm:GetParameter"],
        resources: ["*"],
      })
    );

    nextJSLambdaEdge.edgeLambdaRole.grantPassRole(new ServicePrincipal("logger.cloudfront.amazonaws.com"));

    this.props.internalBucket.grantReadWrite(nextJSLambdaEdge.edgeLambdaRole);
  }

  private static configureNextJSRequestHeaders(nextJSLambdaEdge: NextJSLambdaEdge) {
    // Enable forwarding the headers to the nextjs API lambda to get the authorization header
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
      "/graphql": dmzProxyBehaviorWithLambda,
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
      "/hassu/karttakuva/*": apiBehavior,
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

  private static createApiBehavior(apiEndpoint: string, apiKey: string) {
    const apiBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(apiEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1, OriginSslPolicy.SSL_V3],
        customHeaders: { 'x-api-key': apiKey }
      }),
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
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
