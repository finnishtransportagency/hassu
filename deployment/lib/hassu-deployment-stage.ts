import { Construct, Stage } from "@aws-cdk/core";
import { HassuBackendStack } from "./hassu-backend";
import { HassuFrontendStack } from "./hassu-frontend";
import { HassuAppStack } from "./hassu-app";

export class DeploymentStage extends Stage {
  constructor(scope: Construct) {
    super(scope, "deployment");

    const backend = new HassuBackendStack(this);
    // tslint:disable-next-line:no-unused-expression
    const frontend = new HassuFrontendStack(this);
    // tslint:disable-next-line:no-unused-expression
    new HassuAppStack(this, frontend.bucket);
  }
}
