/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, Duration, Fn } from "@aws-cdk/core";
import { CloudFrontAllowedMethods, CloudFrontWebDistribution, OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { GraphqlApi } from "@aws-cdk/aws-appsync";
import { Bucket } from "@aws-cdk/aws-s3";
import { config } from "./config";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam/lib/principals";

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

    const distribution = new CloudFrontWebDistribution(this, "distribution", {
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
    new cdk.CfnOutput(this, "CloudfrontDomainName", {
      value: distribution.distributionDomainName || "",
    });
    new cdk.CfnOutput(this, "AppSyncAPIKey", {
      value: api.apiKey || "",
    });
  }
}
