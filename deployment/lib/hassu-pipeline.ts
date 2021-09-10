/* tslint:disable:no-console */
import { Construct, Stack } from "@aws-cdk/core";
import { CodePipeline, CodePipelineSource, ShellStep } from "@aws-cdk/pipelines";
import * as cb from "@aws-cdk/aws-codebuild";
import { Config } from "./config";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";

/**
 * The stack that defines the application pipeline
 */
export class HassuPipelineStack extends Stack {
  constructor(scope: Construct) {
    super(scope, "hassu-pipeline", {
      stackName: "hassu-pipeline-" + Config.env,
      env: {
        region: "eu-west-1",
      },
    });
  }

  async process() {
    const config = new Config(this);
    const branch = await config.currentBranch();
    const env = Config.env;
    const appBucketName = config.appBucketName;
    console.log("Deploying pipeline from branch " + branch + " to enviroment " + env);

    // tslint:disable-next-line:no-unused-expression
    new CodePipeline(this, "pipeline", {
      // The pipeline name
      pipelineName: "HassuPipeline-" + env,

      // How it will be built and synthesized
      synth: new ShellStep("Synth", {
        env: { ENVIRONMENT: env },
        // Where the source can be found
        input: CodePipelineSource.gitHub("finnishtransportagency/hassu", branch),

        installCommands: ["npm install -g @aws-amplify/cli", "npm ci"],
        // Install dependencies, build and run cdk synth
        commands: [
          "npm run generate",
          "npm run lint",
          "npm run test",
          "npm run deploy:backend",
          "npm run deploy:frontend",
          "npm run build",
          "aws s3 sync out s3://" + appBucketName + "/",
        ],
      }),
      selfMutation: false,
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
  }
}
