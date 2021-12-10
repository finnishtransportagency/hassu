/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Fn } from "@aws-cdk/core";
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
  ViewerProtocolPolicy,
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
  ServicePrincipal,
} from "@aws-cdk/aws-iam";
import * as fs from "fs";
import { EdgeFunction } from "@aws-cdk/aws-cloudfront/lib/experimental";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { Bucket } from "@aws-cdk/aws-s3";
import * as ssm from "@aws-cdk/aws-ssm";
import { readVariables } from "./util/cdkoutputs";

export class HassuFrontendStack extends cdk.Stack {
  constructor(scope: Construct) {
    const env = Config.env;
    super(scope, "frontend", {
      stackName: "hassu-frontend-" + env,
      env: {
        region: "us-east-1",
      },
      tags: Config.tags,
    });
  }

  public async process() {
    const env = Config.env;
    const config = await Config.instance(this);

    await new Builder(".", "./build", { args: ["build"] }).build();

    const frontendRequestFunction = this.createFrontendRequestFunction(
      env,
      config.basicAuthenticationUsername,
      config.basicAuthenticationPassword
    );
    const dmzProxyBehaviorWithLambda = HassuFrontendStack.createDmzProxyBehavior(
      config.dmzProxyEndpoint,
      frontendRequestFunction
    );
    const dmzProxyBehavior = HassuFrontendStack.createDmzProxyBehavior(config.dmzProxyEndpoint);
    const behaviours: Record<string, BehaviorOptions> = await this.createDistributionProperties(
      config,
      dmzProxyBehaviorWithLambda,
      dmzProxyBehavior
    );

    let domain: any;
    if (config.cloudfrontCertificateArn) {
      domain = {
        certificate: acm.Certificate.fromCertificateArn(this, "certificate", config.cloudfrontCertificateArn),
        domainNames: [config.frontendDomainName],
      };
    }

    const id = `NextJsApp-${env}`;
    const nextJSLambdaEdge = new NextJSLambdaEdge(this, id, {
      serverlessBuildOutDir: "./build",
      runtime: Runtime.NODEJS_14_X,
      env: { region: "us-east-1" },
      withLogging: true,
      name: {
        apiLambda: `${id}Api`,
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
      cloudfrontProps: { priceClass: PriceClass.PRICE_CLASS_100 },
    });
    nextJSLambdaEdge.edgeLambdaRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["logs:*", "xray:*"],
        resources: ["*"],
      })
    );
    nextJSLambdaEdge.edgeLambdaRole.grantPassRole(new ServicePrincipal("logger.cloudfront.amazonaws.com"));

    new cdk.CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: "",
    });
    new cdk.CfnOutput(this, "AppSyncPrivateDNSName", {
      value: "",
    });
  }

  private createFrontendRequestFunction(
    env: string,
    basicAuthenticationUsername: string,
    basicAuthenticationPassword: string
  ): EdgeFunction {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequest.js`).toString("UTF-8");
    const functionCode = Fn.sub(sourceCode, {
      BASIC_USERNAME: basicAuthenticationUsername,
      BASIC_PASSWORD: basicAuthenticationPassword,
    });

    const role = new Role(this, "frontendRequestFunctionRole", {
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
    return new cloudfront.experimental.EdgeFunction(this, "frontendRequestFunction", {
      runtime: Runtime.NODEJS_14_X,
      functionName: "frontendRequestFunction" + env,
      code: Code.fromInline(functionCode),
      handler: "index.handler",
      role,
    });
  }

  private async createDistributionProperties(
    config: Config,
    dmzProxyBehaviorWithLambda: BehaviorOptions,
    dmzProxyBehavior: BehaviorOptions
  ): Promise<Record<string, BehaviorOptions>> {
    return {
      "/oauth2/*": dmzProxyBehaviorWithLambda,
      "/graphql": dmzProxyBehaviorWithLambda,
      "/yllapito/tiedostot/*": await this.createYllapitoTiedostotBehavior(config),
      "/yllapito/graphql": dmzProxyBehaviorWithLambda,
      "/yllapito/kirjaudu": dmzProxyBehaviorWithLambda,
      "/keycloak/*": dmzProxyBehavior,
    };
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

  private async createYllapitoTiedostotBehavior(config: Config): Promise<BehaviorOptions> {
    let keyGroups: KeyGroup[];
    let originAccessIdentity;

    if (Config.env === "localstack") {
      keyGroups = [];
      originAccessIdentity = undefined;
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
        parameterName: "/" + Config.env + "/FrontendPublicKeyId",
        stringValue: publicKey.publicKeyId,
      });

      originAccessIdentity = OriginAccessIdentity.fromOriginAccessIdentityName(
        this,
        "CloudfrontOriginAccessIdentity" + Config.env,
        readVariables("database").CloudFrontOriginAccessIdentity
      );
    }

    return {
      origin: new S3Origin(
        Bucket.fromBucketAttributes(this, "yllapitoBucketOrigin", {
          region: "eu-west-1",
          bucketName: Config.yllapitoBucketName,
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
}
