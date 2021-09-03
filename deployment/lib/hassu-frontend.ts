/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, CustomResource, Duration, Fn } from "@aws-cdk/core";
import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  OriginAccessIdentity,
  PriceClass,
  SecurityPolicyProtocol,
} from "@aws-cdk/aws-cloudfront";
import { GraphqlApi } from "@aws-cdk/aws-appsync";
import { Bucket } from "@aws-cdk/aws-s3";
import { config } from "./config";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam/lib/principals";
import { ViewerCertificate } from "@aws-cdk/aws-cloudfront/lib/web-distribution";
import * as ssm from "@aws-cdk/aws-ssm";

export class HassuFrontendStack extends cdk.Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, api: GraphqlApi) {
    super(scope, "frontend", { stackName: "hassu-frontend-" + config.env });

    const bucket = new Bucket(this, "app-bucket", { bucketName: "hassu-app-" + config.env });

    const oai = new OriginAccessIdentity(this, "oai");
    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
        principals: [new CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
      })
    );

    const certificateId = ssm.StringParameter.valueForStringParameter(this, "/CloudfrontCertificateId/dev");

    const distribution = new CloudFrontWebDistribution(this, "distribution", {
      priceClass: PriceClass.PRICE_CLASS_100,
      viewerCertificate: ViewerCertificate.fromIamCertificate(certificateId, {
        securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2021,
      }),
      originConfigs: [
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
        {
          customOriginSource: {
            domainName: Fn.select(2, Fn.split("/", api.graphqlUrl)),
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: false,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              pathPattern: "/graphql",
            },
          ],
        },
      ],
    });

    this.bucket = bucket;

    const serviceToken = ssm.StringParameter.valueForStringParameter(this, "VaylapilviRoute53RecordServiceToken");
    const appHostName = "app-" + config.env;
    new CustomResource(this, "apprecord", {
      serviceToken,
      resourceType: "Custom::VaylapilviRoute53Record",
      properties: {
        Type: "CNAME",
        Name: appHostName,
        Records: [distribution.distributionDomainName],
        Comment: "Hassu " + config.env + " cloudfront",
      },
    });

    const apiHostName = "api-" + config.env;
    new CustomResource(this, "apirecord", {
      serviceToken,
      resourceType: "Custom::VaylapilviRoute53Record",
      properties: {
        Type: "CNAME",
        Name: apiHostName,
        Records: [Fn.select(2, Fn.split("/", api.graphqlUrl))],
        Comment: "Hassu " + config.env + " Appsync",
      },
    });

    new cdk.CfnOutput(this, "CloudfrontDomainName", {
      value: distribution.distributionDomainName || "",
    });
    new cdk.CfnOutput(this, "CloudfrontPrivateDNSName", {
      value: appHostName + ".hassu-dev.vaylapilvi.aws",
    });
    new cdk.CfnOutput(this, "AppSyncPrivateDNSName", {
      value: apiHostName + ".hassu-dev.vaylapilvi.aws",
    });
    new cdk.CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
  }
}
