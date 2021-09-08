/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct } from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  DistributionProps,
  OriginAccessIdentity,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import { Bucket } from "@aws-cdk/aws-s3";
import { config } from "./config";
import * as ssm from "@aws-cdk/aws-ssm";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { HttpOrigin } from "@aws-cdk/aws-cloudfront-origins/lib/http-origin";
import { BehaviorOptions } from "@aws-cdk/aws-cloudfront/lib/distribution";

export class HassuFrontendStack extends cdk.Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct) {
    const env = config.env;
    super(scope, "frontend", { stackName: "hassu-frontend-" + env });

    const oai = new OriginAccessIdentity(this, "OriginAccessIdentity", { comment: "Allow cloudfront to access S3" });

    const bucket = new Bucket(this, "app-bucket", { bucketName: config.appBucketName });
    bucket.grantRead(oai);

    const dmzAlb = ssm.StringParameter.valueForStringParameter(this, "DmzAlb");

    const dmzBehavior: BehaviorOptions = {
      compress: true,
      origin: new HttpOrigin(dmzAlb, {
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
    };

    const frontendDmainName = "hassudev.testivaylapilvi.fi";

    const distributionProps: DistributionProps = {
      priceClass: PriceClass.PRICE_CLASS_100,
      domainNames: [frontendDmainName],
      defaultRootObject: "index.html",
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        origin: new S3Origin(bucket, {
          originAccessIdentity: oai,
        }),
      },
      additionalBehaviors: {
        "/oauth2/*": dmzBehavior,
        "/graphql": dmzBehavior,
        "/yllapito/graphql": dmzBehavior,
        "/yllapito/kirjaudu": dmzBehavior,
      },
    };

    if (env === "dev") {
      const certificateArn = ssm.StringParameter.valueForStringParameter(this, "CloudfrontCertificateArnDev");
      (distributionProps as any).certificate = acm.Certificate.fromCertificateArn(this, "certificate", certificateArn);
    }

    new Distribution(this, "distribution", distributionProps);

    this.bucket = bucket;

    new cdk.CfnOutput(this, "CloudfrontDomainName", {
      value: frontendDmainName,
    });
    new cdk.CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: "",
    });
    new cdk.CfnOutput(this, "AppSyncPrivateDNSName", {
      value: "",
    });
  }
}
