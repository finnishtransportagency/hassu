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
  FunctionEventType,
  OriginAccessIdentity,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { Config } from "./config";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Code, IVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { CompositePrincipal, Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as fs from "fs";
import * as path from "path";
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
import { IVpc, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import assert from "assert";
import {
  ApplicationListener,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerCondition,
  Protocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  LogDrivers,
  OperatingSystemFamily,
  Secret,
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
  }

  public async process(): Promise<void> {
    if (Config.isHotswap) {
      return;
    }

    const env = Config.env;
    const config = await Config.instance(this);

    this.cloudFrontOriginAccessIdentity = (await readDatabaseStackOutputs()).CloudFrontOriginAccessIdentity || ""; // Empty default string for localstack deployment
    this.cloudFrontOriginAccessIdentityReportBucket = (await readPipelineStackOutputs()).CloudfrontOriginAccessIdentityReportBucket || ""; // Empty default string for localstack deployment

    const edgeFunctionRole = this.createEdgeFunctionRole();

    const frontendRequestFunction = this.createFrontendRequestFunction(
      env,
      config.basicAuthenticationUsername,
      config.basicAuthenticationPassword,
      edgeFunctionRole
    );

    const dmzProxyBehaviorWithLambda = HassuFrontendStack.createDmzProxyBehavior(
      config.dmzProxyEndpoint,
      config.frontendDomainName,
      frontendRequestFunction
    );

    const dmzProxyBehavior = HassuFrontendStack.createDmzProxyBehavior(config.dmzProxyEndpoint, config.frontendDomainName);
    const mmlApiKey = await config.getParameterNow("MmlApiKey");
    const apiEndpoint = await config.getParameterNow("ApiEndpoint");
    const apiBehavior = this.createApiBehavior(apiEndpoint, mmlApiKey, env);
    const publicGraphqlBehavior = this.createPublicGraphqlDmzProxyBehavior(
      config.dmzProxyEndpoint,
      config.frontendDomainName,
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

    const logBucket = new Bucket(this, "CloudfrontLogs", {
      bucketName: `hassu-${Config.env}-cloudfront`,
      versioned: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ enabled: true, expiration: Duration.days(366 / 2) }],
      enforceSSL: true,
    });

    // Cache policyt on luotu suoraan sen perusteella mitä serverless-next luo defaulttina
    let nextJsStaticsCachePolicy: cloudfront.CachePolicy;
    let nextJsImageCachePolicy: cloudfront.CachePolicy;
    let nextJsAppCachePolicy: cloudfront.CachePolicy;
    if (env == "dev" || env == "prod") {
      nextJsStaticsCachePolicy = new cloudfront.CachePolicy(this, "NextJsStaticsCachePolicy", {
        cachePolicyName: "NextJsStaticsCachePolicy",
        defaultTtl: Duration.seconds(2592000),
        minTtl: Duration.seconds(2592000),
        maxTtl: Duration.seconds(2592000),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      });

      new ssm.StringParameter(this, "NextJsStaticsCachePolicyId", {
        parameterName: "/NextJsStaticsCachePolicyId",
        stringValue: nextJsStaticsCachePolicy.cachePolicyId,
      });

      nextJsImageCachePolicy = new cloudfront.CachePolicy(this, "NextJsImageCachePolicy", {
        cachePolicyName: "NextJsImageCachePolicy",
        defaultTtl: Duration.seconds(86400),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(31536000),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      });

      new ssm.StringParameter(this, "NextJsImageCachePolicyId", {
        parameterName: "/NextJsImageCachePolicyId",
        stringValue: nextJsImageCachePolicy.cachePolicyId,
      });

      nextJsAppCachePolicy = new cloudfront.CachePolicy(this, "NextJsAppCachePolicy", {
        cachePolicyName: "NextJsAppCachePolicy",
        defaultTtl: Duration.seconds(0),
        minTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(31536000),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      });

      new ssm.StringParameter(this, "NextJsAppCachePolicyId", {
        parameterName: "/NextJsAppCachePolicyId",
        stringValue: nextJsAppCachePolicy.cachePolicyId,
      });
    } else {
      const nextJsStaticsCachePolicyId = await config.getGlobalSecureInfraParameter("NextJsStaticsCachePolicyId", "");
      nextJsStaticsCachePolicy = CachePolicy.fromCachePolicyId(
        this,
        "NextJsStaticsCachePolicyImportedId",
        nextJsStaticsCachePolicyId
      ) as CachePolicy;

      const nextJsImageCachePolicyId = await config.getGlobalSecureInfraParameter("NextJsImageCachePolicyId", "");
      nextJsImageCachePolicy = CachePolicy.fromCachePolicyId(
        this,
        "NextJsImageCachePolicyImportedId",
        nextJsImageCachePolicyId
      ) as CachePolicy;

      const nextJsAppCachePolicyId = await config.getGlobalSecureInfraParameter("NextJsAppCachePolicyId", "");
      nextJsAppCachePolicy = CachePolicy.fromCachePolicyId(this, "NextJsAppCachePolicyImportedId", nextJsAppCachePolicyId) as CachePolicy;
    }

    let webAclId: string | undefined;
    if (Config.getEnvConfig().waf) {
      webAclId = Fn.importValue("frontendWAFArn");
    }

    // Luodaan omat Lambda@Edge ja Cloudfront Funktiot uutta toteutusta varten
    let frontendRequestLambdaFunction: EdgeFunction | undefined = undefined;
    let edgeLambdasV2: { functionVersion: IVersion; eventType: LambdaEdgeEventType }[] = [];

    // Tuotannossa tarvitaan default behaviourissa (/*) URIn uudelleenkirjoitus, niin että
    // pyyntöihin lisätään sisäisesti /frontend prefix (reititetään tällä Väyläpilven proxyssa)
    // Muissa ympäristöissä uudelleenkirjoitus tehty frontendRequestLambdaFunction funktiossa
    // Tehdään tuotannossa cloudfront.Function avulla koska hieman tehokkaampi ja muokataan vain URIa
    let frontendRequestFunctionProd: cloudfront.Function | undefined = undefined;
    let edgeFunctions: { function: cloudfront.Function; eventType: FunctionEventType }[] = [];

    if (env !== "prod") {
      frontendRequestLambdaFunction = this.createFrontendRequestFunctionV2(
        env,
        config.basicAuthenticationUsername,
        config.basicAuthenticationPassword,
        edgeFunctionRole
      );
      edgeLambdasV2 = [{ functionVersion: frontendRequestLambdaFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }];
    } else {
      frontendRequestFunctionProd = this.createFrontendRequestFunctionProd(env);
      edgeFunctions = [{ function: frontendRequestFunctionProd, eventType: FunctionEventType.VIEWER_REQUEST }];
    }

    const vaylaProxyOrigin = new HttpOrigin(config.dmzProxyEndpoint, {
      originSslProtocols: [OriginSslPolicy.TLS_V1_2],
      customHeaders: { "X-Forwarded-Host": config.frontendDomainName },
    });

    const commonNextBehaviourOptions: BehaviorOptions = {
      origin: vaylaProxyOrigin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
    };

    const newDistribution = new Distribution(this, "NewDistribution", {
      defaultBehavior: {
        ...commonNextBehaviourOptions,
        functionAssociations: edgeFunctions,
        edgeLambdas: edgeLambdasV2,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: nextJsAppCachePolicy,
      },
      additionalBehaviors: {
        "/_next/image*": {
          ...commonNextBehaviourOptions,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: nextJsImageCachePolicy,
        },
        "/_next/data/*": {
          ...commonNextBehaviourOptions,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: nextJsAppCachePolicy,
        },
        "/_next/*": {
          ...commonNextBehaviourOptions,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: nextJsStaticsCachePolicy,
        },
        "/assets/*": {
          ...commonNextBehaviourOptions,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: nextJsStaticsCachePolicy,
        },
        "/api/*": {
          ...commonNextBehaviourOptions,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: nextJsAppCachePolicy,
        },
        ...behaviours,
      },
      domainNames: domain?.domainNames,
      certificate: domain?.certificate,
      priceClass: PriceClass.PRICE_CLASS_100,
      logBucket,
      webAclId,
      errorResponses: this.getErrorResponsesForCloudFront(),
    });

    new CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: newDistribution.distributionDomainName || "",
    });
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: newDistribution.distributionId || "",
    });

    createResourceGroup(this); // Ympäristön valitsemiseen esim. CloudWatchissa
  }

  private getErrorResponsesForCloudFront() {
    return [{ responseHttpStatus: 404, ttl: Duration.seconds(10), httpStatus: 404, responsePagePath: "/404" }];
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
        runtime: Runtime.NODEJS_20_X,
        functionName: "frontendRequestFunction" + env,
        code: Code.fromInline(functionCode),
        handler: "index.handler",
        role,
      });
    }
  }

  private createFrontendRequestFunctionV2(
    env: string,
    basicAuthenticationUsername: string,
    basicAuthenticationPassword: string,
    role: Role
  ): EdgeFunction {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequestV2.js`).toString("utf-8");
    const functionCode = Fn.sub(sourceCode, {
      BASIC_USERNAME: basicAuthenticationUsername,
      BASIC_PASSWORD: basicAuthenticationPassword,
      PREFIX: BaseConfig.frontendPrefix,
    });
    return new cloudfront.experimental.EdgeFunction(this, "frontendRequestFunctionV2", {
      runtime: Runtime.NODEJS_22_X,
      functionName: "frontendRequestFunctionV2" + env,
      code: Code.fromInline(functionCode),
      handler: "index.handler",
      role,
    });
  }

  private createFrontendRequestFunctionProd(env: string): cloudfront.Function {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequestProd.js`).toString("utf-8");
    const functionCode = Fn.sub(sourceCode, {
      PREFIX: BaseConfig.frontendPrefix,
    });
    return new cloudfront.Function(this, "frontendRequestFunctionProd", {
      functionName: "frontendRequestFunctionprod",
      code: cloudfront.FunctionCode.fromInline(functionCode),
    });
  }

  private createSuomifiRequestFunction(env: string, role: Role): EdgeFunction {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/suomifiHeader.js`).toString("utf-8");
    return new cloudfront.experimental.EdgeFunction(this, "suomifiRequestFunction", {
      runtime: Runtime.NODEJS_20_X,
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
      runtime: Runtime.NODEJS_20_X,
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
      "/oauth2/*": dmzProxyBehavior,
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
      "/keycloak/*": this.createKeycloakBehaviour(config.dmzProxyEndpoint, config.frontendDomainName),
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

  private static createDmzProxyBehavior(
    dmzProxyEndpoint: string,
    frontendDomainName: string,
    frontendRequestFunction?: cloudfront.experimental.EdgeFunction
  ) {
    const dmzBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzProxyEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2],
        customHeaders: { "X-Forwarded-Host": frontendDomainName },
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
    frontendDomainName: string,
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
        originSslProtocols: [OriginSslPolicy.TLS_V1_2],
        customHeaders: { "X-Forwarded-Host": frontendDomainName },
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
        originSslProtocols: [OriginSslPolicy.TLS_V1_2],
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

  // Todellisuudessa dev, test ja training ympäristöjen Keycloak pyynnöt päätyvät dev ympäristön Cloudfrontin läpi,
  // Tämä määritetty NEXT_PUBLIC_KEYCLOAK_DOMAIN muuttujassa
  private createKeycloakBehaviour(dmzProxyEndpoint: string, frontendDomainName: string) {
    const keycloakBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzProxyEndpoint, {
        originSslProtocols: [OriginSslPolicy.TLS_V1_2],
        customHeaders: {
          "X-Forwarded-Host": frontendDomainName,
          Forwarded: `proto=https; host=${frontendDomainName}:443`,
        },
      }),
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    return keycloakBehavior;
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

const CORE_REGION = "eu-west-1";

export const frontendCoreStackName = "hassu-frontend-core-" + Config.env;

export class HassuFrontendCoreStack extends Stack {
  private props: HassuFrontendStackProps;

  constructor(scope: Construct, props: HassuFrontendStackProps) {
    super(scope, "frontend-core", {
      stackName: frontendCoreStackName,
      terminationProtection: Config.getEnvConfig().terminationProtection,
      env: {
        account: props.awsAccountId,
        region: CORE_REGION,
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

    const { EventSqsUrl, HyvaksymisEsitysSqsUrl, AppSyncAPIKey } = await readBackendStackOutputs();
    const accountStackOutputs = await readAccountStackOutputs();
    const ssmParameters = await readParametersForEnv<HassuSSMParameters>(BaseConfig.infraEnvironment, Region.EU_WEST_1);

    // Sama ALB käytössä muualla kuin prodissa, joten ne priorisoidaan keskenään
    const listenerPriorityMap: { [key: string]: number } = {
      prod: 20,
      training: 20,
      test: 30,
      dev: 40,
      developer: 50,
    };

    // VPC
    const vpc = await this.getVpc(config);

    // import ALB Listener. ALB Defined in hassu-suomifi repo
    const listener = ApplicationListener.fromLookup(this, "ExistingListener", {
      listenerArn: await config.getParameterNow(`/${Config.infraEnvironment}/ALBListenerArn`),
    });

    const securityGroup = new SecurityGroup(this, "NextjsSG", {
      vpc,
      description: "Security group for Next.js",
      allowAllOutbound: true,
    });

    // Parameters
    // apinoitu next.config.js
    let version = process.env.CODEBUILD_SOURCE_VERSION || "";
    try {
      const buffer = fs.readFileSync(path.resolve(__dirname, "../../.version"));
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
      NEXT_PUBLIC_REACT_APP_API_KEY: AppSyncAPIKey || "",
      NEXT_PUBLIC_REACT_APP_API_URL: `https://${config.frontendApiDomainName}/graphql`,
      NEXT_PUBLIC_FRONTEND_DOMAIN_NAME: config.frontendDomainName,
      NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: ssmParameters.KeycloakClientId,
      NEXT_PUBLIC_KEYCLOAK_DOMAIN: ssmParameters.KeycloakDomain,
      NEXT_PUBLIC_EVK_ACTIVATION_DATE: ssmParameters.EvkActivationDate,
      INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
      ENVIRONMENT: Config.env,
      TABLE_PROJEKTI: Config.projektiTableName,
      TABLE_LYHYTOSOITE: Config.lyhytOsoiteTableName,
      INTERNAL_BUCKET_NAME: Config.internalBucketName,
      FRONTEND_DOMAIN_NAME: config.frontendDomainName,
      VELHO_API_URL: ssmParameters.VelhoApiUrl,
      VELHO_AUTH_URL: ssmParameters.VelhoAuthenticationUrl,
      EVENT_SQS_URL: EventSqsUrl,
      HYVAKSYMISESITYS_SQS_URL: HyvaksymisEsitysSqsUrl, // TODO: tarvitseeko tätä?? Miksi??
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      ASIANHALLINTA_SQS_URL: this.props.asianhallintaQueue.queueUrl,
      SEARCH_DOMAIN: accountStackOutputs.SearchDomainEndpointOutput,
    };

    if (Config.env !== "prod") {
      containerEnv.PUBLIC_BUCKET_NAME = Config.publicBucketName;
      containerEnv.YLLAPITO_BUCKET_NAME = Config.internalBucketName;
    }

    // Secrets
    const velhoUsername = ssm.StringParameter.fromSecureStringParameterAttributes(this, "VelhoUsername", {
      parameterName: `/${Config.infraEnvironment}/VelhoUsername`,
    });

    const velhoPassword = ssm.StringParameter.fromSecureStringParameterAttributes(this, "VelhoPassword", {
      parameterName: `/${Config.infraEnvironment}/VelhoPassword`,
    });

    const containerSecrets: { [key: string]: Secret } = {
      VELHO_USERNAME: Secret.fromSsmParameter(velhoUsername),
      VELHO_PASSWORD: Secret.fromSsmParameter(velhoPassword),
    };

    // ECS + Fargate
    const cluster = new Cluster(this, "ECSCluster", {
      vpc,
      clusterName: "NextjsCluster-" + Config.env,
    });

    const logGroup = new logs.LogGroup(this, "EcsLogGroup", {
      logGroupName: `ecs/nextjs-${Config.env}`,
      retention: logs.RetentionDays.SIX_MONTHS, // TODO tähän oikea politiikka
    });

    const repository = Repository.fromRepositoryName(this, "NextjsRepo", Config.nextjsImageRepositoryName);

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      family: "NextJsTaskDef-" + Config.env,
      // TODO seuraa onko tämä riittävä vai pitääkö tuunata suuntaan tai toiseen
      memoryLimitMiB: 2048,
      cpu: 1024,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.X86_64,
      },
    });

    const containerName = "NextJsContainer-" + Config.env;
    const containerPort = 3000;

    taskDefinition.addContainer("NextJsContainer", {
      image: ContainerImage.fromEcrRepository(repository, this.props.nextJsImageTag),
      containerName: containerName,
      portMappings: [{ containerPort: containerPort }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "NextJsContainer",
        logGroup: logGroup,
      }),
      environment: containerEnv,
      secrets: containerSecrets,
    });

    taskDefinition.addToTaskRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:*", "xray:*", "ssm:GetParameter"],
        resources: ["*"],
      })
    );

    const fargateService = new FargateService(this, "nextJsAppFargateService", {
      cluster,
      serviceName: "nextjs-service-" + Config.env,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      healthCheckGracePeriod: Duration.seconds(180),
      circuitBreaker: {
        rollback: true,
      },
      securityGroups: [securityGroup],
    });

    const targetGroup = new ApplicationTargetGroup(this, "NextjsTG", {
      targetGroupName: "NextJsTG" + Config.env,
      vpc,
      port: containerPort,
      protocol: ApplicationProtocol.HTTP,
      targets: [
        fargateService.loadBalancerTarget({
          containerName: containerName,
          containerPort: containerPort,
        }),
      ],
      healthCheck: {
        enabled: true,
        path: "/api/health",
        healthyThresholdCount: 3,
        protocol: Protocol.HTTP,
        port: containerPort.toString(),
      },
    });

    // Lisätään "perus" autoskaalausta. Seurataan pitääkö tunkata suuntaan tai toiseen
    const scalableTarget = fargateService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 3,
    });

    scalableTarget.scaleOnCpuUtilization("CPUScaling", {
      targetUtilizationPercent: 75,
      scaleOutCooldown: Duration.seconds(300), // Verbose default
      scaleInCooldown: Duration.seconds(300), // Verbose default
    });

    scalableTarget.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: 75,
      scaleOutCooldown: Duration.seconds(300), // Verbose default
      scaleInCooldown: Duration.seconds(300), // Verbose default
    });

    // ALB reitityssäännöt
    const pathPatterns = ["/_next*", "/api*", "/assets*", "/frontend*", "/robots.txt"];
    const headerValues = [config.frontendDomainName];
    // ALB sallii vain 5 sääntöä per rule
    const maxConditionValues = 5;

    const maxPathsPerRule = maxConditionValues - headerValues.length;

    if (maxPathsPerRule <= 0) {
      throw new Error(`ALB sääntöjen luontia tarvitsee muuttaa!!`);
    }

    const chunks: string[][] = [];
    for (let i = 0; i < pathPatterns.length; i += maxPathsPerRule) {
      chunks.push(pathPatterns.slice(i, i + maxPathsPerRule));
    }

    chunks.forEach((chunk, index) => {
      listener.addTargetGroups(`NextjsRule${index}`, {
        priority: listenerPriorityMap[Config.isPermanentEnvironment() ? Config.env : "developer"] + index,
        conditions: [ListenerCondition.pathPatterns(chunk), ListenerCondition.httpHeader("X-Forwarded-Host", headerValues)],
        targetGroups: [targetGroup],
      });
    });

    const searchDomain = await getOpenSearchDomain(this, accountStackOutputs);
    searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", taskDefinition.taskRole);
    // Logic not needed as long as we run only in dev but keep it here as reminder when expanding to elsewhere
    const environmentsBlacklistedFromTimeShift = ["prod", "training"];
    const isEnvironmentBlacklistedFromTimeShift = environmentsBlacklistedFromTimeShift.includes(env);
    if (!isEnvironmentBlacklistedFromTimeShift) {
      this.props.projektiTable.grantReadWriteData(taskDefinition.taskRole);
      this.props.eventQueue.grantSendMessages(taskDefinition.taskRole);
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      this.props.asianhallintaQueue.grantSendMessages(taskDefinition.taskRole);
      this.props.yllapitoBucket.grantReadWrite(taskDefinition.taskRole);
      this.props.publicBucket.grantReadWrite(taskDefinition.taskRole);
    }
    this.props.lyhytOsoiteTable.grantReadData(taskDefinition.taskRole);
    this.props.internalBucket.grantReadWrite(taskDefinition.taskRole); // granted to lambda in this.configureNextJSAWSPermissions(nextJSLambdaEdge.edgeLambdaRole);
  }

  private async getVpc(config: Config): Promise<IVpc> {
    const vpcName = await config.getParameterNow("HassuVpcName");
    assert(vpcName, "HassuVpcName SSM-parametri pitää olla olemassa");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
    return vpc;
  }
}
