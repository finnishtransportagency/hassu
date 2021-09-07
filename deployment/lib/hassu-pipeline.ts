/* tslint:disable:no-console */
import { Construct, Stack } from "@aws-cdk/core";
import { CodePipeline, CodePipelineSource, ShellStep } from "@aws-cdk/pipelines";
import * as cb from "@aws-cdk/aws-codebuild";
import { config } from "./config";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { DeploymentStage } from "./hassu-deployment-stage";

/**
 * The stack that defines the application pipeline
 */
export class HassuPipelineStack extends Stack {
  private readonly branch: string;

  constructor(scope: Construct, branch: string) {
    super(scope, "hassu-pipeline", { stackName: "hassu-pipeline-" + config.env });
    this.branch = branch;
  }

  async process() {
    console.log("Deploying pipeline from branch " + this.branch + " to enviroment " + config.env);

    // tslint:disable-next-line:no-unused-expression
    const synth = new ShellStep("Synth", {
      env: { ENVIRONMENT: config.env, GIT_BRANCH: this.branch },
      // Where the source can be found
      input: CodePipelineSource.gitHub("finnishtransportagency/hassu", this.branch),

      installCommands: ["npm install -g @aws-amplify/cli", "npm ci"],
      // Install dependencies, build and run cdk synth
      commands: ["npm run generate", "npm run lint", "npm run test", "npm run synth"],
    });
    const codePipeline = new CodePipeline(this, "pipeline", {
      // The pipeline name
      pipelineName: "HassuPipeline-" + config.env,

      // How it will be built and synthesized
      synth,
      selfMutationCodeBuildDefaults: {
        buildEnvironment: {
          environmentVariables: { ENVIRONMENT: { value: config.env }, GIT_BRANCH: { value: this.branch } },
        },
      },
      codeBuildDefaults: {
        partialBuildSpec: cb.BuildSpec.fromObject({
          cache: {
            paths: ["/root/.cache/**/*", "/root/.npm/**/*"],
          },
        }),
        rolePolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["s3:*", "cloudformation:*", "sts:*"],
            resources: ["*"],
          }),
        ],
      },
    });
    const deploymentStage = new DeploymentStage(this);
    codePipeline.addStage(deploymentStage).addPost(
      new ShellStep("app-build", {
        additionalInputs: {
          synthsrc: synth.addOutputDirectory("src"),
        },
        env: { ENVIRONMENT: config.env, GIT_BRANCH: this.branch },
        envFromCfnOutputs: {
          REACT_APP_API_URL: deploymentStage.cloudfrontDomainNameOutput,
          REACT_APP_API_KEY: deploymentStage.appSyncAPIKeyOutput,
        },

        commands: ["cp synthsrc/API.ts src/API.ts", "npm i", "npm run build", "aws s3 sync out s3://" + config.appBucketName + "/"],
      })
    );
  }
}
