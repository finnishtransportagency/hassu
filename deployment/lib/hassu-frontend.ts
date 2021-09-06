/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Duration } from "@aws-cdk/core";
import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  OriginAccessIdentity,
  PriceClass,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import { Bucket } from "@aws-cdk/aws-s3";
import { config } from "./config";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam/lib/principals";
import { ViewerCertificate } from "@aws-cdk/aws-cloudfront/lib/web-distribution";
import * as ssm from "@aws-cdk/aws-ssm";

export class HassuFrontendStack extends cdk.Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct) {
    const env = config.env;
    super(scope, "frontend", { stackName: "hassu-frontend-" + env });

    const bucket = new Bucket(this, "app-bucket", { bucketName: "hassu-app-" + env });

    const oai = new OriginAccessIdentity(this, "oai");
    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
        principals: [new CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
      })
    );

    const dmzAlb = ssm.StringParameter.valueForStringParameter(this, "DmzAlb");

    let viewerCertificate;
    const frontendDmainName = "hassudev.testivaylapilvi.fi";
    if (env === "dev") {
      const certificateId = ssm.StringParameter.valueForStringParameter(this, "/CloudfrontCertificateId/dev");
      viewerCertificate = ViewerCertificate.fromIamCertificate(certificateId, {
        securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2021,
        aliases: [frontendDmainName],
      });
    }

    new CloudFrontWebDistribution(this, "distribution", {
      priceClass: PriceClass.PRICE_CLASS_100,
      viewerCertificate,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originConfigs: [
        // /*
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: oai,
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD,
              defaultTtl: Duration.seconds(10),
            },
          ],
        },

        // /graphql
        {
          customOriginSource: {
            domainName: dmzAlb,
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: false,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              pathPattern: "/graphql",
            },
            {
              compress: true,
              isDefaultBehavior: false,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              pathPattern: "/yllapito/graphql",
            },
            {
              compress: true,
              isDefaultBehavior: false,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              pathPattern: "/yllapito/kirjaudu",
            },
          ],
        },
      ],
    });

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
