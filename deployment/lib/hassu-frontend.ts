/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Duration, Fn, RemovalPolicy } from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import {
  AllowedMethods,
  CachePolicy,
  CfnPublicKey,
  KeyGroup,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy
} from "@aws-cdk/aws-cloudfront";
import { Config } from "./config";
import { HttpOrigin } from "@aws-cdk/aws-cloudfront-origins/lib/http-origin";
import { BehaviorOptions } from "@aws-cdk/aws-cloudfront/lib/distribution";
import { Builder } from "@sls-next/lambda-at-edge";
import { NextJSLambdaEdge } from "@sls-next/cdk-construct";
import { Code, Runtime } from "@aws-cdk/aws-lambda";
import {
  CompositePrincipal,
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "@aws-cdk/aws-iam";
import * as fs from "fs";
import { EdgeFunction } from "@aws-cdk/aws-cloudfront/lib/experimental";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import * as ssm from "@aws-cdk/aws-ssm";
import {
  readAccountStackOutputs,
  readBackendStackOutputs,
  readDatabaseStackOutputs,
  readPipelineStackOutputs
} from "../bin/setupEnvironment";
import { IOriginAccessIdentity } from "@aws-cdk/aws-cloudfront/lib/origin-access-identity";
import { getOpenSearchDomain } from "./common";

// These should correspond to CfnOutputs produced by this stack
export type FrontendStackOutputs = {
  CloudfrontPrivateDNSName: string;
  CloudfrontDistributionId: string;
  FrontendPublicKeyIdOutput: string;
};

interface HassuFrontendStackProps {
  internalBucket: Bucket;
}

export class HassuFrontendStack extends cdk.Stack {
  private props: HassuFrontendStackProps;
  private appSyncAPIKey?: string;
  private cloudFrontOriginAccessIdentity!: string;
  private cloudFrontOriginAccessIdentityReportBucket!: string;

  constructor(scope: Construct, props: HassuFrontendStackProps) {
    const env = Config.env;
    super(scope, "frontend", {
      stackName: "hassu-frontend-" + env,
      env: {
        region: "us-east-1",
      },
      tags: Config.tags,
    });
    this.props = props;
  }

  public async process() {
    if (Config.isHotswap) {
      return;
    }

    const env = Config.env;
    const config = await Config.instance(this);

    this.appSyncAPIKey = (await readBackendStackOutputs()).AppSyncAPIKey;
    this.cloudFrontOriginAccessIdentity = (await readDatabaseStackOutputs()).CloudFrontOriginAccessIdentity || ""; // Empty default string for localstack deployment
    this.cloudFrontOriginAccessIdentityReportBucket =
      (await readPipelineStackOutputs()).CloudfrontOriginAccessIdentityReportBucket || ""; // Empty default string for localstack deployment

    await new Builder(".", "./build", {
      enableHTTPCompression: true,
      minifyHandlers: true,
      args: ["build"],
      env: {
        FRONTEND_DOMAIN_NAME: config.frontendDomainName,
        REACT_APP_API_KEY: this.appSyncAPIKey,
      },
    }).build();

    const edgeFunctionRole = this.createEdgeFunctionRole();

    const frontendRequestFunction = this.createFrontendRequestFunction(
      env,
      config.basicAuthenticationUsername,
      config.basicAuthenticationPassword,
      edgeFunctionRole
    );

    const dmzProxyBehaviorWithLambda = HassuFrontendStack.createDmzProxyBehavior(
      config.dmzProxyEndpoint,
      frontendRequestFunction
    );

    const dmzProxyBehavior = HassuFrontendStack.createDmzProxyBehavior(config.dmzProxyEndpoint);
    const behaviours: Record<string, BehaviorOptions> = await this.createDistributionProperties(
      env,
      config,
      dmzProxyBehaviorWithLambda,
      dmzProxyBehavior,
      edgeFunctionRole
    );

    let domain: any;
    if (config.cloudfrontCertificateArn) {
      domain = {
        certificate: acm.Certificate.fromCertificateArn(this, "certificate", config.cloudfrontCertificateArn),
        domainNames: [config.frontendDomainName],
      };
    }

    const id = `NextJsApp-${env}`;

    const logBucket = new Bucket(this, "CloudfrontLogs", {
      bucketName: `hassu-${Config.env}-cloudfront`,
      versioned: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ enabled: true, expiration: Duration.days(366 / 2) }],
    });

    const nextJSLambdaEdge = new NextJSLambdaEdge(this, id, {
      serverlessBuildOutDir: "./build",
      runtime: Runtime.NODEJS_14_X,
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
        edgeLambdas: frontendRequestFunction
          ? [{ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }]
          : [],
      },
      cloudfrontProps: { priceClass: PriceClass.PRICE_CLASS_100, logBucket },
      invalidationPaths: ["/*"],
    });
    this.configureNextJSAWSPermissions(nextJSLambdaEdge);
    HassuFrontendStack.configureNextJSRequestHeaders(nextJSLambdaEdge);

    const accountStackOutputs = await readAccountStackOutputs();
    const searchDomain = await getOpenSearchDomain(this, accountStackOutputs);
    if (nextJSLambdaEdge.nextApiLambda) {
      searchDomain.grantIndexReadWrite("projekti-" + Config.env + "-*", nextJSLambdaEdge.nextApiLambda);
    }

    const distribution: cloudfront.Distribution = nextJSLambdaEdge.distribution;
    new cdk.CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: distribution.distributionDomainName || "",
    });
    new cdk.CfnOutput(this, "CloudfrontDistributionId", {
      value: distribution.distributionId || "",
    });
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
  ): EdgeFunction {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequest.js`).toString("UTF-8");
    const functionCode = Fn.sub(sourceCode, {
      BASIC_USERNAME: basicAuthenticationUsername,
      BASIC_PASSWORD: basicAuthenticationPassword,
    });
    return new cloudfront.experimental.EdgeFunction(this, "frontendRequestFunction", {
      runtime: Runtime.NODEJS_14_X,
      functionName: "frontendRequestFunction" + env,
      code: Code.fromInline(functionCode),
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
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "NextApiLambdaPolicy",
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
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
    const functionCode = fs.readFileSync(`${__dirname}/lambda/tiedostotOriginResponse.js`).toString("UTF-8");

    return new cloudfront.experimental.EdgeFunction(this, "tiedostotOriginResponseFunction", {
      runtime: Runtime.NODEJS_14_X,
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
    edgeFunctionRole: Role
  ): Promise<Record<string, BehaviorOptions>> {
    let { keyGroups, originAccessIdentity, originAccessIdentityReportBucket } = await this.createTrustedKeyGroupsAndOAI(
      config
    );
    let props: Record<string, any> = {
      "/oauth2/*": dmzProxyBehaviorWithLambda,
      "/graphql": dmzProxyBehaviorWithLambda,
      "/tiedostot/*": await this.createPublicBucketBehavior(env, edgeFunctionRole, originAccessIdentity),
      "/yllapito/tiedostot/*": await this.createPrivateBucketBehavior(
        "yllapitoBucket",
        Config.yllapitoBucketName,
        keyGroups,
        originAccessIdentity
      ),
      "/yllapito/graphql": dmzProxyBehaviorWithLambda,
      "/yllapito/kirjaudu": dmzProxyBehaviorWithLambda,
      "/keycloak/*": dmzProxyBehavior,
    };
    if (Config.env == "dev") {
      props["/report/*"] = await this.createPrivateBucketBehavior(
        "reportBucket",
        Config.reportBucketName,
        keyGroups,
        originAccessIdentityReportBucket
      );
    }
    return props;
  }

  private static createDmzProxyBehavior(
    dmzProxyEndpoint: string,
    frontendRequestFunction?: cloudfront.experimental.EdgeFunction
  ) {
    const dmzBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzProxyEndpoint, {
        originSslProtocols: [
          OriginSslPolicy.TLS_V1_2,
          OriginSslPolicy.TLS_V1_2,
          OriginSslPolicy.TLS_V1,
          OriginSslPolicy.SSL_V3,
        ],
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

  private async createPrivateBucketBehavior(
    name: string,
    bucketName: string,
    keyGroups: KeyGroup[],
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
    };
  }

  private async createPublicBucketBehavior(
    env: string,
    role: Role,
    originAccessIdentity?: IOriginAccessIdentity
  ): Promise<BehaviorOptions> {
    const tiedostotOriginResponseFunction = this.createTiedostotOriginResponseFunction(env, role);
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
      edgeLambdas: [
        {
          functionVersion: tiedostotOriginResponseFunction.currentVersion,
          eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
        },
      ],
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

    if (Config.env === "localstack") {
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
      new cdk.CfnOutput(this, "FrontendPublicKeyIdOutput", {
        value: publicKey.publicKeyId || "",
      });

      originAccessIdentity = OriginAccessIdentity.fromOriginAccessIdentityName(
        this,
        "CloudfrontOriginAccessIdentity" + Config.env,
        this.cloudFrontOriginAccessIdentity
      );

      originAccessIdentityReportBucket = OriginAccessIdentity.fromOriginAccessIdentityName(
        this,
        "CloudfrontOriginAccessIdentityReportBucket",
        this.cloudFrontOriginAccessIdentityReportBucket
      );
    }

    return { keyGroups, originAccessIdentity, originAccessIdentityReportBucket };
  }
}
