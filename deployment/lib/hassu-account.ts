// Contains code generated or recommended by Amazon Q
import { Construct } from "constructs";
import { Aws, aws_codebuild, aws_codeconnections, aws_ecr, CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config, SSMParameterName } from "./config";
import { CfnDomain, Domain, EngineVersion, TLSSecurityPolicy } from "aws-cdk-lib/aws-opensearchservice";
import { AccountRootPrincipal, Effect, ManagedPolicy, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as iam from "aws-cdk-lib/aws-iam";
import { LifecycleRule, RepositoryEncryption, TagStatus } from "aws-cdk-lib/aws-ecr";
import { CfnDomain as CodeartifactDomain, CfnRepository as CodeartifactRepository } from "aws-cdk-lib/aws-codeartifact";
import { ITopic, Topic } from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { CfnMaintenanceWindow, CfnMaintenanceWindowTarget, CfnMaintenanceWindowTask, StringParameter } from "aws-cdk-lib/aws-ssm";
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import {
  BastionHostLinux,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  InstanceInitiatedShutdownBehavior,
  IVpc,
  MachineImage,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Code, LambdaInsightsVersion, LayerVersion, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { AwsApi, LambdaFunction } from "aws-cdk-lib/aws-events-targets";

// These should correspond to CfnOutputs produced by this stack
export type AccountStackOutputs = {
  SearchDomainEndpointOutput: string;
  SearchDomainArnOutput: string;
};

export const accountStackName = "hassu-account";

export class HassuAccountStack extends Stack {
  public searchDomain: Domain;

  constructor(scope: Construct) {
    super(scope, "account", {
      stackName: accountStackName,
      terminationProtection: true,
      env: {
        region: "eu-west-1",
        account: process.env.CDK_DEFAULT_ACCOUNT,
      },
      tags: Config.tags,
    });

    if (!Config.isDevAccount() && !Config.isProdAccount()) {
      throw new Error("Only dev and prod accounts are supported");
    }
  }

  async main() {
    const config = await Config.instance(this);
    this.configureOpenSearch();
    this.configureBuildImageECR();
    this.configureGitHubConnection();
    const alarmTopic = await this.configureSNSForAlarms(config);
    const vpcName = await config.getParameterNow("HassuVpcName");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
    // Bastion host is created in both dev and prod accounts.
    // Note: prod previously had a manually created bastion — remove it after deploying this.
    await this.createBastionHost(config, vpc, alarmTopic);
    await this.createKeycloakLambda(vpc);
    await this.configureNextJSImageECR(config);
  }

  private async createKeycloakLambda(vpc: IVpc) {
    const keycloak = new NodejsFunction(this, "KeycloakLambda", {
      functionName: "hassu-keycloak-" + Config.env,
      runtime: Runtime.NODEJS_22_X,
      entry: `${__dirname}/../../backend/src/suomifi/deleteExpiredKeycloakUsers.ts`,
      handler: "handleScheduledEvent",
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.seconds(60),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["aws-xray-sdk-core", "nodemailer", "@aws-sdk/*"],
      },
      vpc,
      tracing: Tracing.ACTIVE,
      insightsVersion: LambdaInsightsVersion.fromInsightVersionArn(
        "arn:aws:lambda:eu-west-1:580247275435:layer:LambdaInsightsExtension:64"
      ),
      layers: [
        new LayerVersion(this, "BaseLayer-" + Config.env, {
          code: Code.fromAsset("./layers/lambda-base"),
          compatibleRuntimes: [Runtime.NODEJS_22_X],
          description: "Lambda base layer",
        }),
        LayerVersion.fromLayerVersionArn(
          this,
          "paramLayer",
          "arn:aws:lambda:eu-west-1:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:82"
        ),
      ],
      logRetention: RetentionDays.SEVEN_YEARS,
    });
    keycloak.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLambdaInsightsExecutionRolePolicy"));
    keycloak.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"));
    new Rule(this, "KeycloakRule", {
      description: "Cleanup users",
      schedule: Schedule.rate(Duration.hours(24)),
      targets: [new LambdaFunction(keycloak)],
    });
    keycloak.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameter"],
        resources: ["*"],
      })
    );
  }

  private async createBastionHost(config: Config, vpc: IVpc, alarmTopic: ITopic) {
    // Bastion host accessible via SSM Session Manager (no SSH/public IP needed).
    // Security hardening:
    //   - requireImdsv2: prevents SSRF-based credential theft via instance metadata
    //   - encrypted EBS: data at rest encryption
    //   - GP3: better price-performance than default GP2
    const bastionHost = new BastionHostLinux(this, "BastionHost", {
      vpc,
      subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      instanceName: "vls-bastion",
      requireImdsv2: true,
      machineImage: MachineImage.latestAmazonLinux2023(),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: BlockDeviceVolume.ebs(10, {
            encrypted: true,
            volumeType: EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });
    bastionHost.instance.applyRemovalPolicy(RemovalPolicy.DESTROY);
    bastionHost.instance.instance.instanceInitiatedShutdownBehavior = InstanceInitiatedShutdownBehavior.STOP;

    this.configureBastionPatching(bastionHost, alarmTopic);
  }

  /**
   * Automated weekly patching for the bastion host using SSM Patch Manager.
   *
   * What Patch Manager handles automatically:
   *   - OS security patches (kernel, openssl, glibc etc.)
   *   - Bugfix updates to OS packages
   *   - Rebooting when kernel/security patches require it
   *   - Patch compliance reporting (SSM → Patch Manager → Compliance)
   *
   * What still requires manual action:
   *   - Major OS upgrades (e.g. AL2 → AL2023) — requires CDK code change
   *   - Instance type changes — requires CDK code change
   *   - Investigating patching failures (alarm notifies via SNS)
   *
   * Timeline (every Sunday, UTC):
   *   02:50  EventBridge starts the instance
   *   03:00  Maintenance window opens, AWS-RunPatchBaseline installs patches
   *   ~03:xx Instance reboots automatically if kernel/security patches require it
   *   05:00  Maintenance window closes
   *   05:30  EventBridge stops the instance
   *
   * Patch compliance results are visible in SSM → Patch Manager → Compliance.
   */
  private configureBastionPatching(bastionHost: BastionHostLinux, alarmTopic: ITopic) {
    const instanceId = bastionHost.instanceId;

    // Start instance 10 min before maintenance window so SSM Agent has time to register
    const startRule = new Rule(this, "BastionStartRule", {
      description: "Start bastion host before patching maintenance window",
      schedule: Schedule.expression("cron(50 2 ? * SUN *)"),
    });
    startRule.addTarget(
      new AwsApi({
        service: "EC2",
        action: "startInstances",
        parameters: { InstanceIds: [instanceId] },
      })
    );

    // Stop instance 30 min after maintenance window ends to allow post-patch reboot to complete
    const stopRule = new Rule(this, "BastionStopRule", {
      description: "Stop bastion host after patching maintenance window",
      schedule: Schedule.expression("cron(30 5 ? * SUN *)"),
    });
    stopRule.addTarget(
      new AwsApi({
        service: "EC2",
        action: "stopInstances",
        parameters: { InstanceIds: [instanceId] },
      })
    );

    const maintenanceWindow = new CfnMaintenanceWindow(this, "BastionMaintenanceWindow", {
      name: "bastion-weekly-patching",
      schedule: "cron(0 3 ? * SUN *)",
      duration: 2,
      cutoff: 0,
      allowUnassociatedTargets: false,
      description: "Weekly patching for bastion host",
    });

    const target = new CfnMaintenanceWindowTarget(this, "BastionPatchTarget", {
      windowId: maintenanceWindow.ref,
      resourceType: "INSTANCE",
      targets: [{ key: "InstanceIds", values: [instanceId] }],
      name: "bastion-host",
    });

    // AWS-RunPatchBaseline is the AWS-managed SSM document for OS patching.
    // RebootIfNeeded reboots the instance only when patches require it (e.g. kernel updates).
    const patchTask = new CfnMaintenanceWindowTask(this, "BastionPatchTask", {
      windowId: maintenanceWindow.ref,
      taskArn: "AWS-RunPatchBaseline",
      taskType: "RUN_COMMAND",
      priority: 1,
      maxConcurrency: "1",
      maxErrors: "1",
      targets: [{ key: "WindowTargetIds", values: [target.ref] }],
      taskInvocationParameters: {
        maintenanceWindowRunCommandParameters: {
          parameters: { Operation: ["Install"], RebootOption: ["RebootIfNeeded"] },
          timeoutSeconds: 600,
        },
      },
    });
    patchTask.addDependency(target);

    // Custom metrics for bastion patching via EventBridge rules.
    // Maintenance Window publishes state-change events that we match by window-id.
    const customMetricNamespace = "Custom/BastionPatching";

    const patchSuccessRule = new Rule(this, "BastionPatchSuccessMetricRule", {
      description: "Publish custom metric when bastion patching succeeds",
      eventPattern: {
        source: ["aws.ssm"],
        detailType: ["Maintenance Window Task Execution State-change Notification"],
        detail: {
          "window-id": [maintenanceWindow.ref],
          status: ["SUCCESS"],
        },
      },
    });
    patchSuccessRule.addTarget(
      new AwsApi({
        service: "CloudWatch",
        action: "putMetricData",
        parameters: {
          Namespace: customMetricNamespace,
          MetricData: [
            {
              MetricName: "PatchingSucceeded",
              Value: 1,
              Unit: "Count",
            },
          ],
        },
      })
    );

    const patchFailureRule = new Rule(this, "BastionPatchFailureMetricRule", {
      description: "Publish custom metric when bastion patching fails",
      eventPattern: {
        source: ["aws.ssm"],
        detailType: ["Maintenance Window Task Execution State-change Notification"],
        detail: {
          "window-id": [maintenanceWindow.ref],
          status: ["FAILED", "TIMED_OUT"],
        },
      },
    });
    patchFailureRule.addTarget(
      new AwsApi({
        service: "CloudWatch",
        action: "putMetricData",
        parameters: {
          Namespace: customMetricNamespace,
          MetricData: [
            {
              MetricName: "PatchingFailed",
              Value: 1,
              Unit: "Count",
            },
          ],
        },
      })
    );

    // Alarm on the custom failure metric
    const patchFailureMetric = new Metric({
      namespace: customMetricNamespace,
      metricName: "PatchingFailed",
      statistic: "Sum",
      period: Duration.hours(3),
    });
    const patchAlarm = new Alarm(this, "BastionPatchFailureAlarm", {
      alarmName: "Bastion patching failed",
      alarmDescription: "AWS-RunPatchBaseline failed on bastion host during weekly maintenance window",
      metric: patchFailureMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    patchAlarm.addAlarmAction(new SnsAction(alarmTopic));
  }

  private configureOpenSearch() {
    let zoneAwareness;
    let dataNodeInstanceType = "t3.small.search";
    if (Config.isProdAccount()) {
      zoneAwareness = {
        enabled: true,
        availabilityZoneCount: 2,
      };
      dataNodeInstanceType = "m5.large.search";
    }
    this.searchDomain = new Domain(this, "SearchDomain", {
      domainName: "hassu",
      version: EngineVersion.OPENSEARCH_1_0,
      enableVersionUpgrade: true,
      encryptionAtRest: { enabled: true },
      nodeToNodeEncryption: true,
      enforceHttps: true,
      zoneAwareness,
      capacity: {
        masterNodes: 0,
        dataNodes: 2,
        dataNodeInstanceType,
      },
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["es:ESHttpGet", "es:ESHttpPut", "es:ESHttpPost", "es:ESHttpDelete"],
          principals: [new AccountRootPrincipal().grantPrincipal],
        }),
      ],
      tlsSecurityPolicy: TLSSecurityPolicy.TLS_1_2,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.createPrivateNpmRepo();

    const cfnDomain = this.searchDomain.node.defaultChild as CfnDomain;
    cfnDomain.offPeakWindowOptions = {
      enabled: true,
      offPeakWindow: { windowStartTime: { hours: 20, minutes: 0 } },
    };

    new CfnOutput(this, "SearchDomainEndpointOutput", {
      value: this.searchDomain.domainEndpoint || "",
    });

    new CfnOutput(this, "SearchDomainArnOutput", {
      value: this.searchDomain.domainArn || "",
    });
  }

  private configureBuildImageECR() {
    const repositoryName = Config.buildImageRepositoryName;
    new aws_ecr.Repository(this, repositoryName, {
      repositoryName,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: RepositoryEncryption.KMS,
      lifecycleRules: [
        {
          rulePriority: 1,
          description: "Remove untagged images over 30 days old",
          maxImageAge: Duration.days(30),
          tagStatus: TagStatus.UNTAGGED,
        },
      ],
    });
  }

  private async configureSNSForAlarms(config: Config): Promise<ITopic> {
    const topic = new Topic(this, "SNSForAlarms", {
      fifo: false,
      displayName: "Hassu-hälytykset",
      topicName: "hassualarms",
    });
    new StringParameter(this, "SNSForAlarmsArn", {
      parameterName: SSMParameterName.HassuAlarmsSNSArn,
      stringValue: topic.topicArn,
    });

    const alarmEmails = await config.getParameterNow("AlarmEmails");
    alarmEmails.split(",").forEach((email, index) => {
      topic.addSubscription(new subscriptions.EmailSubscription(email.trim()));
    });

    // Allow EventBridge to publish to this topic from rules in this account
    // Supports both eu-west-1 (main region) and us-east-1 (WAF, CloudFront)
    topic.addToResourcePolicy(
      new PolicyStatement({
        sid: "AllowEventBridgePublish",
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("events.amazonaws.com")],
        actions: ["SNS:Publish"],
        resources: [topic.topicArn],
        conditions: {
          ArnLike: {
            "aws:SourceArn": [`arn:aws:events:eu-west-1:${this.account}:rule/*`, `arn:aws:events:us-east-1:${this.account}:rule/*`],
          },
        },
      })
    );

    return topic;
  }

  private configureGitHubConnection() {
    // GitHub App connection for CodeBuild, shared across all repos in this account.
    // This is already done but in case it need to be done again then
    // After deploying, activate in AWS Console:
    // CodePipeline → Settings → Connections → finnishtransportagency-github → Update pending connection
    // Requires a GitHub org admin to approve the AWS Connector app installation.
    const connection = new aws_codeconnections.CfnConnection(this, "GitHubConnection", {
      connectionName: "finnishtransportagency-github",
      providerType: "GitHub",
      tags: Config.tagsArray.map(({ key, value }) => ({ key, value })),
    });

    // hassu-suomifi repo's pipeline needs the ARN
    new StringParameter(this, "GitHubConnectionArn", {
      parameterName: SSMParameterName.GitHubConnectionArn,
      stringValue: connection.attrConnectionArn,
      description:
        "ARN of the finnishtransportagency-github CodeConnections (GitHub App) connection, used by CodeBuild and CodePipeline across all repos",
    });

    // Account-level GitHub credential for CodeBuild — all projects using codebuild.Source.gitHub() use this automatically
    new aws_codebuild.CfnSourceCredential(this, "GitHubCodeBuildCredential", {
      authType: "CODECONNECTIONS",
      serverType: "GITHUB",
      token: connection.attrConnectionArn,
    });
  }

  private createPrivateNpmRepo() {
    const codeartifactDomain = new CodeartifactDomain(this, "hassu-npm-domain", {
      domainName: "hassu-domain",
    });
    const repositoryName = "hassu-private-npm";

    const codeartifactRepository = new CodeartifactRepository(this, "hassu-npm-repo", {
      domainName: codeartifactDomain.domainName,
      repositoryName,
      description: "Private NPM repository for Hassu",
      permissionsPolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Action: ["codeartifact:*"],
            Principal: "*",
            Resource: `arn:aws:codeartifact:${Aws.REGION}:${Aws.ACCOUNT_ID}:repository/${codeartifactDomain.domainName}/${repositoryName}`,
          },
        ],
      },
    });
    codeartifactRepository.addDependency(codeartifactDomain);
  }

  private async configureNextJSImageECR(config: Config) {
    const repositoryName = Config.nextjsImageRepositoryName;
    const lifecycleRules: LifecycleRule[] = Config.isProdAccount()
      ? [
          {
            rulePriority: 1,
            description: "Keep 15 latest released prod images",
            tagPatternList: ["*-prod"],
            maxImageCount: 15,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 2,
            description: "Keep latest training release candidate image",
            tagPatternList: ["*-training*"],
            maxImageCount: 1,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 3,
            description: "Keep latest test release candidate image",
            tagPatternList: ["*-test*"],
            maxImageCount: 1,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 4,
            description: "Remove all the other images after 1 day",
            maxImageAge: Duration.days(1),
            tagStatus: TagStatus.ANY,
          },
        ]
      : [
          {
            rulePriority: 1,
            description: "Keep ten latest training release candidate image",
            tagPatternList: ["*-training*"],
            maxImageCount: 10,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 2,
            description: "Keep ten latest test release candidate image",
            tagPatternList: ["*-test*"],
            maxImageCount: 10,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 3,
            description: "Keep ten latest commit sha (dev) images",
            tagPatternList: ["*"],
            maxImageCount: 10,
            tagStatus: TagStatus.TAGGED,
          },
          {
            rulePriority: 4,
            description: "Remove all the other images after 30 days",
            maxImageAge: Duration.days(30),
            tagStatus: TagStatus.ANY,
          },
        ];
    const repo = new aws_ecr.Repository(this, "NextJSECRRepo", {
      repositoryName,
      lifecycleRules,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: RepositoryEncryption.AES_256,
      imageScanOnPush: true,
    });
    if (Config.isProdAccount()) {
      await this.allowCrossAccountPushFromDev(repo, config);
    }
  }

  private async allowCrossAccountPushFromDev(repository: aws_ecr.Repository, config: Config) {
    const devAccountId = await config.getParameterNow("DevAccountId");
    repository.addToResourcePolicy(
      new PolicyStatement({
        sid: "AllowCrossAccountECRPushFromDev",
        effect: Effect.ALLOW,
        principals: [new iam.AccountPrincipal(devAccountId)],
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchGetImage",
        ],
      })
    );
  }
}
