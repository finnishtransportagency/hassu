import * as cdk from "aws-cdk-lib";
import { aws_codebuild, aws_ecr, RemovalPolicy, SecretValue, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import {
  BuildEnvironmentVariableType,
  BuildSpec,
  ComputeType,
  GitHubSourceProps,
  LinuxBuildImage,
  LocalCacheMode,
} from "aws-cdk-lib/aws-codebuild";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { BuildEnvironmentVariable } from "aws-cdk-lib/aws-codebuild/lib/project";
import { BlockPublicAccess, Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";

// These should correspond to CfnOutputs produced by this stack
export type PipelineStackOutputs = {
  CloudfrontOriginAccessIdentityReportBucket: string;
};

const pipelines: Record<string, { name: string; buildspec: string; env: string; branches: string[]; concurrentBuildLimit?: number }[]> = {
  dev: [
    {
      name: "feature",
      env: "feature",
      branches: ["feature/*"],
      buildspec: "./deployment/lib/buildspec/buildspec-feature.yml",
    },
    {
      name: "renovate",
      env: "feature",
      branches: ["renovate/*"],
      buildspec: "./deployment/lib/buildspec/buildspec-feature.yml",
    },
    {
      name: "dev",
      env: "dev",
      branches: ["main"],
      buildspec: "./deployment/lib/buildspec/buildspec.yml",
      concurrentBuildLimit: 1,
    },
    {
      name: "test",
      env: "test",
      branches: ["test"],
      buildspec: "./deployment/lib/buildspec/buildspec.yml",
      concurrentBuildLimit: 1,
    },
    {
      name: "training",
      env: "training",
      branches: ["training"],
      buildspec: "./deployment/lib/buildspec/buildspec-training.yml",
      concurrentBuildLimit: 1,
    },
    {
      name: "e2e-dev",
      env: "e2e-dev",
      branches: ["dev", "robottest/*"],
      buildspec: "./deployment/lib/buildspec/e2etest.yml",
      concurrentBuildLimit: 1,
    },
    {
      name: "e2e-test",
      env: "e2e-test",
      branches: ["test"],
      buildspec: "./deployment/lib/buildspec/e2etest.yml",
      concurrentBuildLimit: 1,
    },
  ],
  prod: [
    {
      name: "prod",
      env: "prod",
      branches: ["prod"],
      buildspec: "./deployment/lib/buildspec/buildspec-prod.yml",
      concurrentBuildLimit: 1,
    },
  ],
};

/**
 * CI/CD pipelines. Ajetaan kerran AWS-tiliä kohden.
 */
export class HassuPipelineStack extends Stack {
  constructor(scope: Construct) {
    super(scope, "hassu-pipelines", {
      stackName: "hassu-pipelines-" + Config.env,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
  }

  async process(): Promise<void> {
    const config = await Config.instance(this);
    const isDevAccount = Config.isDevAccount();

    // GitHub creds only once per account
    new codebuild.GitHubSourceCredentials(this, "HassuCodeBuildGitHubCreds", {
      accessToken: SecretValue.secretsManager("github-token"),
    });

    if (isDevAccount) {
      // Common bucket for test reports
      const reportBucket = new Bucket(this, "reportbucket", {
        bucketName: Config.reportBucketName,
        accessControl: BucketAccessControl.PRIVATE,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      const oaiName = "CloudfrontOriginAccessIdentityReportBucketOAI";
      const oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new cdk.CfnOutput(this, "CloudfrontOriginAccessIdentityReportBucket", {
        value: oai.originAccessIdentityId || "",
      });
      reportBucket.grantRead(oai);
    }

    this.createImageBuilderProject();

    const buildImage = LinuxBuildImage.fromEcrRepository(
      aws_ecr.Repository.fromRepositoryName(this, "buildImageRepository", Config.buildImageRepositoryName),
      "latest"
    );

    for (const pipelineConfig of isDevAccount ? pipelines.dev : pipelines.prod) {
      const branches = pipelineConfig.branches;
      const env = pipelineConfig.env;
      const name = pipelineConfig.name;
      const concurrentBuildLimit = pipelineConfig.concurrentBuildLimit;

      const buildspec = pipelineConfig.buildspec;
      let branchOrRef;

      const webhookFilters = branches.map((b) => codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs(b));
      if (branches.length > 1) {
        branchOrRef = undefined;
      } else {
        branchOrRef = branches[0];
      }
      const sourceProps: GitHubSourceProps = {
        owner: "finnishtransportagency",
        repo: "hassu",

        webhookTriggersBatchBuild: false,
        reportBuildStatus: true,
        branchOrRef,
        webhookFilters,
        cloneDepth: 0,
      };

      const gitHubSource = codebuild.Source.gitHub(sourceProps);

      let environmentVariables: { [name: string]: BuildEnvironmentVariable } = {
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
      };
      if (env == "prod") {
        environmentVariables = {
          ...environmentVariables,
          PERSON_SEARCH_API_URL_PROD: {
            value: "/PersonSearchApiURLProd",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_USERNAME_PROD: {
            value: "/PersonSearchApiUsernameProd",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_PASSWORD_PROD: {
            value: "/PersonSearchApiPasswordProd",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
        };
      } else {
        environmentVariables = {
          ...environmentVariables,
          PERSON_SEARCH_API_URL: {
            value: "/PersonSearchApiURL",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_USERNAME: {
            value: "/PersonSearchApiUsername",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
          PERSON_SEARCH_API_PASSWORD: {
            value: "/PersonSearchApiPassword",
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
          },
        };
      }
      const projectName = "Hassu-build-" + name;
      const buildProject = new codebuild.Project(this, projectName, {
        projectName,
        concurrentBuildLimit,
        buildSpec: BuildSpec.fromSourceFilename(buildspec),
        source: gitHubSource,
        cache: codebuild.Cache.local(LocalCacheMode.CUSTOM, LocalCacheMode.SOURCE, LocalCacheMode.DOCKER_LAYER),
        environment: {
          buildImage,
          privileged: true,
          computeType: ComputeType.MEDIUM,
          environmentVariables,
        },
        grantReportGroupPermissions: true,
        badge: true,
      });
      buildProject.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:*", "cloudformation:*", "sts:*", "ecr:*", "ssm:*", "secretsmanager:GetSecretValue", "codebuild:StartBuild"],
          resources: ["*"],
        })
      );
      buildProject.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["iam:CreateServiceLinkedRole"],
          resources: ["arn:aws:iam::*:role/aws-service-role/*"],
        })
      );
    }
  }

  private createImageBuilderProject() {
    const sourceProps: GitHubSourceProps = {
      owner: "finnishtransportagency",
      repo: "hassu",
      branchOrRef: "main",
      webhook: false,
      webhookTriggersBatchBuild: false,
    };
    const gitHubSource = codebuild.Source.gitHub(sourceProps);

    const imageBuilderProject = new aws_codebuild.Project(this, "hassu-buildimage-builder", {
      projectName: "Hassu-buildimage-builder",
      buildSpec: BuildSpec.fromSourceFilename("./deployment/lib/buildspec/buildspec-updatebuildimage.yml"),
      source: gitHubSource,
      cache: codebuild.Cache.local(LocalCacheMode.CUSTOM, LocalCacheMode.SOURCE, LocalCacheMode.DOCKER_LAYER),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: ComputeType.SMALL,
      },
    });
    imageBuilderProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:*", "ecr:*", "ssm:*", "codebuild:StartBuild"],
        resources: ["*"],
      })
    );
    return imageBuilderProject;
  }
}
