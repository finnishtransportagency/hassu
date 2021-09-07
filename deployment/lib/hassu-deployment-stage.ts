/* tslint:disable:no-unused-expression */
import { Construct, Stage } from "@aws-cdk/core";
import { HassuBackendStack } from "./hassu-backend";
import { HassuFrontendStack } from "./hassu-frontend";

export class DeploymentStage extends Stage {
  constructor(scope: Construct) {
    super(scope, "deployment");

    new HassuBackendStack(this);
    new HassuFrontendStack(this);
  }
}
