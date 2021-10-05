/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Fn } from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  DistributionProps,
  FunctionCode,
  FunctionEventType,
  OriginAccessIdentity,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import { Bucket } from "@aws-cdk/aws-s3";
import { Config } from "./config";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { HttpOrigin } from "@aws-cdk/aws-cloudfront-origins/lib/http-origin";
import { BehaviorOptions } from "@aws-cdk/aws-cloudfront/lib/distribution";
import * as fs from "fs";

export class HassuFrontendStack extends cdk.Stack {
  constructor(scope: Construct) {
    const env = Config.env;
    super(scope, "frontend", {
      stackName: "hassu-frontend-" + env,
      env: {
        region: "eu-west-1",
      },
    });
  }

  public async process() {
    const env = Config.env;
    const config = await Config.instance(this);
    const frontendRequestFunction = this.createFrontendRequestFunction(
      env,
      config.basicAuthenticationUsername,
      config.basicAuthenticationPassword
    );
    const dmzProxyBehavior = HassuFrontendStack.createDmzProxyBehavior(
      config.dmzProxyEndpoint,
      frontendRequestFunction
    );
    const s3ApplicationOrigin = this.createS3ApplicationOrigin(config.appBucketName);
    const distributionProperties = HassuFrontendStack.createDistributionProperties(
      s3ApplicationOrigin,
      dmzProxyBehavior,
      frontendRequestFunction
    );
    this.addSSLCertificateToCloudfront(config, distributionProperties);
    this.createDistribution(distributionProperties);

    new cdk.CfnOutput(this, "CloudfrontDomainName", {
      value: config.frontendDomainName,
    });
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
  ) {
    const sourceCode = fs.readFileSync(`${__dirname}/lambda/frontendRequest.js`).toString("UTF-8");
    const functionCode = Fn.sub(sourceCode, {
      BASIC_USERNAME: basicAuthenticationUsername,
      BASIC_PASSWORD: basicAuthenticationPassword,
    });
    return new cloudfront.Function(this, "frontendRequestFunction", {
      functionName: "frontendRequestFunction" + env,
      code: FunctionCode.fromInline(functionCode),
    });
  }

  private static createDistributionProperties(
    s3ApplicationOrigin: S3Origin,
    dmzProxyBehavior: BehaviorOptions,
    frontendRequestFunction: cloudfront.Function
  ) {
    const distributionProps: DistributionProps = {
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultRootObject: "index.html",
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        origin: s3ApplicationOrigin,
        functionAssociations: [
          {
            function: frontendRequestFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "/oauth2/*": dmzProxyBehavior,
        "/graphql": dmzProxyBehavior,
        "/yllapito/graphql": dmzProxyBehavior,
        "/yllapito/kirjaudu": dmzProxyBehavior,
      },
    };
    return distributionProps;
  }

  private addSSLCertificateToCloudfront(config: Config, distributionProps: DistributionProps) {
    if (config.cloudfrontCertificateArn) {
      const modifiableProps = distributionProps as any;
      modifiableProps.certificate = acm.Certificate.fromCertificateArn(
        this,
        "certificate",
        config.cloudfrontCertificateArn
      );
      modifiableProps.domainNames = [config.frontendDomainName];
    }
  }

  private createDistribution(distributionProperties: DistributionProps) {
    new Distribution(this, "distribution", distributionProperties);
  }

  private createS3ApplicationOrigin(applicationBucketName: string) {
    const identityForS3Access = new OriginAccessIdentity(this, "OriginAccessIdentity", {
      comment: "Allow cloudfront to access S3",
    });
    const bucketForApplication = this.createBucketForApplication(applicationBucketName, identityForS3Access);
    return new S3Origin(bucketForApplication, {
      originAccessIdentity: identityForS3Access,
    });
  }

  private static createDmzProxyBehavior(dmzProxyEndpoint: string, frontendRequestFunction: cloudfront.Function) {
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
      functionAssociations: [
        {
          function: frontendRequestFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ],
    };
    return dmzBehavior;
  }

  private createBucketForApplication(applicationBucketName: string, identityForS3Access: OriginAccessIdentity) {
    const bucket = new Bucket(this, "app-bucket", { bucketName: applicationBucketName });
    bucket.grantRead(identityForS3Access);
    return bucket;
  }
}
