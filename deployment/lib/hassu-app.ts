/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { config } from "./config";

export class HassuAppStack extends cdk.Stack {
  constructor(scope: Construct, bucket: Bucket) {
    super(scope, "app", { stackName: "hassu-app-" + config.env });

    new BucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("./out")],
      destinationBucket: bucket,
    });
  }
}
