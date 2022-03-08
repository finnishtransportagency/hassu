/* tslint:disable:no-console no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, SecretValue, Stack } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";
import * as codebuild from "@aws-cdk/aws-codebuild";
import { BuildEnvironmentVariableType, ComputeType, LocalCacheMode } from "@aws-cdk/aws-codebuild";
import { Config } from "./config";
import { BuildSpec } from "@aws-cdk/aws-codebuild/lib/build-spec";
import { LinuxBuildImage } from "@aws-cdk/aws-codebuild/lib/project";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { GitHubSourceProps } from "@aws-cdk/aws-codebuild/lib/source";
import { Repository } from "@aws-cdk/aws-ecr/lib/repository";
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";

// These should correspond to CfnOutputs produced by this stack
export type PipelineStackOutputs = {
  CloudfrontOriginAccessIdentityReportBucket: string;
};

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
      tags: Config.tags,
    });
  }

  async process() {
    const config = await Config.instance(this);
    const branch = config.getBranch();
    const env = Config.env;
    console.log("Deploying pipeline from branch " + branch + " to enviroment " + env);

    if (env == "dev" || env == "test") {
      await this.createRobotTestPipeline(env, config);
    }

    if (Config.isPermanentEnvironment()) {
      await this.createPipeline(env, config, "./deployment/lib/buildspec/buildspec.yml");
    } else {
      await this.createPipeline(env, config, "./deployment/lib/buildspec/buildspec-feature.yml");
    }
  }

  private async createPipeline(env: string, config: Config, buildspecFileName: string) {
    let branchOrRef;
    let webhookFilters;
    let reportBuildStatus: boolean;
    const branch = config.getBranch();
    if (branch === "main" && env == "dev") {
      // GitHub creds only once per account
      new codebuild.GitHubSourceCredentials(this, "CodeBuildGitHubCreds", {
        accessToken: SecretValue.secretsManager("github-token"),
      });
      // Common bucket for test reports
      const reportBucket = new Bucket(this, "reportbucket", { bucketName: Config.reportBucketName });

      const oaiName = "CloudfrontOriginAccessIdentityReportBucketOAI";
      const oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new cdk.CfnOutput(this, "CloudfrontOriginAccessIdentityReportBucket", {
        value: oai.originAccessIdentityName || "",
      });

      reportBucket.grantRead(oai);
    }
    if (config.isFeatureBranch() && !config.isDeveloperEnvironment()) {
      webhookFilters = [codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs("feature/*")];
      reportBuildStatus = true;
    } else {
      webhookFilters = [codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs(branch)];
      branchOrRef = branch;
      reportBuildStatus = false;
    }
    const sourceProps: GitHubSourceProps = {
      owner: "finnishtransportagency",
      repo: "hassu",
      webhook: true,
      webhookTriggersBatchBuild: false,
      reportBuildStatus,
      branchOrRef,
      webhookFilters,
      cloneDepth: 0,
    };
    const gitHubSource = codebuild.Source.gitHub(sourceProps);
    new codebuild.Project(this, "HassuProject", {
      projectName: "Hassu-" + env,
      buildSpec: BuildSpec.fromSourceFilename(buildspecFileName),
      source: gitHubSource,
      cache: codebuild.Cache.local(LocalCacheMode.CUSTOM, LocalCacheMode.SOURCE, LocalCacheMode.DOCKER_LAYER),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: ComputeType.MEDIUM,
        environmentVariables: {
          ENVIRONMENT: { value: env },
          VELHO_AUTH_URL: {
            value: config.getInfraParameterPath("VelhoAuthenticationUrl", config.velhoEnv),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          VELHO_API_URL: {
            value: config.getInfraParameterPath("VelhoApiUrl", config.velhoEnv),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          VELHO_USERNAME: { value: await config.getSecureInfraParameter("VelhoUsername", config.velhoEnv) },
          VELHO_PASSWORD: { value: await config.getSecureInfraParameter("VelhoPassword", config.velhoEnv) },

          PERSON_SEARCH_API_URL: {
            value: config.getInfraParameterPath("PersonSearchApiURL"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_URL_PROD: {
            value: config.getInfraParameterPath("PersonSearchApiURLProd"),
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
          PERSON_SEARCH_API_ACCOUNT_TYPES: {
            value: config.getInfraParameterPath("PersonSearchApiAccountTypes"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          NEXT_PUBLIC_VAYLA_EXTRANET_URL: {
            value: config.getInfraParameterPath("ExtranetHomePageUrl"),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          NEXT_PUBLIC_VELHO_BASE_URL: {
            value: config.getInfraParameterPath("VelhoBaseUrl", config.velhoEnv),
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          NODE_OPTIONS: {
            value: "--max_old_space_size=4096 --max-old-space-size=4096",
            type: BuildEnvironmentVariableType.PLAINTEXT,
          },
        },
      },
      grantReportGroupPermissions: true,
      badge: true,
    }).addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "s3:*",
          "cloudformation:*",
          "sts:*",
          "ecr:*",
          "ssm:*",
          "secretsmanager:GetSecretValue",
          "codebuild:StartBuild",
        ],
        resources: ["*"],
      })
    );
  }

  private async createRobotTestPipeline(env: string, config: Config) {
    const sourceProps: GitHubSourceProps = {
      owner: "finnishtransportagency",
      repo: "hassu",
      webhook: true,
      webhookTriggersBatchBuild: false,
      reportBuildStatus: true,
      webhookFilters: [codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs("robottest/*")],
    };
    const gitHubSource = codebuild.Source.gitHub(sourceProps);
    new codebuild.Project(this, "HassuRobotTest", {
      projectName: "Hassu-robottest-" + env,
      buildSpec: BuildSpec.fromSourceFilename("./deployment/lib/buildspec/robottest.yml"),
      source: gitHubSource,
      cache: codebuild.Cache.local(LocalCacheMode.CUSTOM, LocalCacheMode.SOURCE, LocalCacheMode.DOCKER_LAYER),
      environment: {
        buildImage: LinuxBuildImage.fromEcrRepository(
          Repository.fromRepositoryName(this, "RobotBuildImage", "hassu-robot")
        ),
        privileged: true,
        computeType: ComputeType.MEDIUM,
        environmentVariables: {
          ENVIRONMENT: { value: env },
          FRONTEND_DOMAIN_NAME_DEV: { value: await config.getSecureInfraParameter("FrontendDomainName", "dev") },
        },
      },
      grantReportGroupPermissions: true,
      badge: true,
      artifacts: codebuild.Artifacts.s3({
        bucket: Bucket.fromBucketName(this, "RobotTestArtifactBucket", Config.reportBucketName),
        includeBuildId: false,
        packageZip: false,
        encryption: false,
        identifier: "RobotTest",
      }),
    }).addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*", "ecr:*", "ssm:*", "secretsmanager:GetSecretValue"],
        resources: ["*"],
      })
    );
  }
}
