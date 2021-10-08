/* tslint:disable:no-console no-unused-expression */
import { Construct, SecretValue, Stack } from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import { BuildEnvironmentVariableType, LocalCacheMode } from "@aws-cdk/aws-codebuild";
import { Config } from "./config";
import { BuildSpec } from "@aws-cdk/aws-codebuild/lib/build-spec";
import { LinuxBuildImage } from "@aws-cdk/aws-codebuild/lib/project";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { GitHubSourceProps } from "@aws-cdk/aws-codebuild/lib/source";

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
    const config = await Config.instance(this);
    const branch = config.branch;
    const env = Config.env;
    const appBucketName = config.appBucketName;
    console.log("Deploying pipeline from branch " + branch + " to enviroment " + env);

    if (Config.isPermanentEnvironment()) {
      await this.createPipeline(env, config, [
        "npm run generate",
        "npm run lint",
        "npm run localstack",
        "npm run test",
        "npm run localstack:stop",
        "npm run deploy:database",
        "npm run deploy:backend",
        "npm run deploy:frontend",
        "npm run build",
        "aws s3 sync out s3://" + appBucketName + "/",
      ]);
    } else {
      await this.createPipeline(env, config, [
        "npm run generate",
        "npm run lint",
        "npm run localstack",
        "npm run test",
        "npm run localstack:stop",
        "npm run build",
      ]);
    }
  }

  private async createPipeline(env: string, config: Config, commands: string[]) {
    let branchOrRef;
    let webhookFilters;
    let reportBuildStatus: boolean;
    if (config.branch === "main") {
      // Github creds only once per account
      new codebuild.GitHubSourceCredentials(this, "CodeBuildGitHubCreds", {
        accessToken: SecretValue.secretsManager("github-token"),
      });
      branchOrRef = "main";
      reportBuildStatus = false;
      webhookFilters = [codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs("main")];
    } else {
      webhookFilters = [codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs("feature/*")];
      reportBuildStatus = true;
    }
    const sourceProps: GitHubSourceProps = {
      owner: "finnishtransportagency",
      repo: "hassu",
      webhook: true,
      webhookTriggersBatchBuild: false,
      reportBuildStatus,
      branchOrRef,
      webhookFilters,
    };
    const gitHubSource = codebuild.Source.gitHub(sourceProps);
    const buildSpec = {
      version: "0.2",
      phases: {
        install: {
          "runtime-versions": {
            java: "corretto11",
            nodejs: 14,
          },
          commands: ["env", "npm install -g @aws-amplify/cli", "npm ci"],
        },
        build: {
          commands,
        },
      },
      cache: {
        paths: ["/root/.cache/**/*", "/root/.npm/**/*", "/root/.gradle/**/*"],
      },
    } as any;
    if (!config.isDeveloperEnvironment()) {
      buildSpec.reports = {
        "unit-tests": {
          files: "**/*",
          "base-directory": ".report/unit",
          "discard-paths": true,
        },
        "unit-test-coverage": {
          files: ".report/coverage/clover.xml",
          "file-format": "CLOVERXML",
          "discard-paths": true,
        },
      };
    }
    new codebuild.Project(this, "HassuProject", {
      projectName: "Hassu-" + env,
      buildSpec: BuildSpec.fromObject(buildSpec),
      source: gitHubSource,
      cache: codebuild.Cache.local(LocalCacheMode.CUSTOM, LocalCacheMode.SOURCE, LocalCacheMode.DOCKER_LAYER),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        environmentVariables: {
          ENVIRONMENT: { value: env },
          VELHO_AUTH_URL: {
            value: config.getInfraParameterPath("VelhoAuthenticationUrl"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          VELHO_API_URL: {
            value: config.getInfraParameterPath("VelhoApiUrl"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          VELHO_USERNAME: { value: await config.getSecureInfraParameter("VelhoUsername") },
          VELHO_PASSWORD: { value: await config.getSecureInfraParameter("VelhoPassword") },

          PERSON_SEARCH_API_URL: {
            value: config.getInfraParameterPath("PersonSearchApiURL"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_USERNAME: {
            value: config.getInfraParameterPath("PersonSearchApiUsername"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_PASSWORD: {
            value: config.getInfraParameterPath("PersonSearchApiPassword"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
        },
      },
      grantReportGroupPermissions: true,
      badge: true,
    }).addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*", "cloudformation:*", "sts:*", "ssm:GetParameter"],
        resources: ["*"],
      })
    );
  }
}
