/* tslint:disable:no-unused-expression */
import { CfnOutput, Construct, Stage } from "@aws-cdk/core";
import { HassuBackendStack } from "./hassu-backend";
import { HassuFrontendStack } from "./hassu-frontend";

export class DeploymentStage extends Stage {
  public readonly appSyncAPIKeyOutput: CfnOutput;
  public readonly cloudfrontDomainNameOutput: CfnOutput;

  constructor(scope: Construct) {
    super(scope, "deployment");

    this.appSyncAPIKeyOutput = new HassuBackendStack(this).appSyncAPIKeyOutput;
    this.cloudfrontDomainNameOutput = new HassuFrontendStack(this).cloudfrontDomainNameOutput;
  }
}
