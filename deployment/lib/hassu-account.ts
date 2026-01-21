import { Construct } from "constructs";
import { Aws, aws_ecr, CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config, SSMParameterName } from "./config";
import { CfnDomain, Domain, EngineVersion, TLSSecurityPolicy } from "aws-cdk-lib/aws-opensearchservice";
import { AccountRootPrincipal, Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnRegistryPolicy, CfnReplicationConfiguration, RepositoryEncryption, TagStatus } from "aws-cdk-lib/aws-ecr";
import { CfnDomain as CodeartifactDomain, CfnRepository as CodeartifactRepository } from "aws-cdk-lib/aws-codeartifact";
import { Topic } from "aws-cdk-lib/aws-sns";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { BastionHostLinux, InstanceInitiatedShutdownBehavior, IVpc, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Code, LambdaInsightsVersion, LayerVersion, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

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
    this.configureSNSForAlarms();
    const vpcName = await config.getParameterNow("HassuVpcName");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
    if (Config.isDevAccount()) {
      await this.createBastionHost(config, vpc);
    }
    await this.createKeycloakLambda(vpc);
    await this.configureNextJSImageECR(config);
  }

  private async createKeycloakLambda(vpc: IVpc) {
    const keycloak = new NodejsFunction(this, "KeycloakLambda", {
      functionName: "hassu-keycloak-" + Config.env,
      runtime: Runtime.NODEJS_20_X,
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
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_333_0,
      layers: [
        new LayerVersion(this, "BaseLayer-" + Config.env, {
          code: Code.fromAsset("./layers/lambda-base"),
          compatibleRuntimes: [Runtime.NODEJS_20_X],
          description: "Lambda base layer",
        }),
        LayerVersion.fromLayerVersionArn(
          this,
          "paramLayer",
          "arn:aws:lambda:eu-west-1:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:21"
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

  private async createBastionHost(config: Config, vpc: IVpc) {
    // Bastion host that allows connection from systems manager
    const bastionHost = new BastionHostLinux(this, "BastionHost", {
      vpc,
      subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      instanceName: "vls-bastion",
    });
    bastionHost.instance.applyRemovalPolicy(RemovalPolicy.DESTROY);
    bastionHost.instance.instance.instanceInitiatedShutdownBehavior = InstanceInitiatedShutdownBehavior.STOP;
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

  private configureSNSForAlarms() {
    const topic = new Topic(this, "SNSForAlarms", {
      fifo: false,
      displayName: "Email-halytykset CloudWatchista",
      topicName: "hassualarms",
    });
    new StringParameter(this, "SNSForAlarmsArn", {
      parameterName: SSMParameterName.HassuAlarmsSNSArn,
      stringValue: topic.topicArn,
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
    new aws_ecr.Repository(this, "NextJSECRRepo", {
      repositoryName,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: RepositoryEncryption.AES_256,
      imageScanOnPush: true,
    });
    await this.replicateECR(repositoryName, config);
  }

  private async replicateECR(repository: string, config: Config) {
    if (Config.isDevAccount()) {
      const prodAccountId = await config.getParameterNow("ProdAccountId");
      new CfnReplicationConfiguration(this, "NextjsRepoReplicationConfig", {
        replicationConfiguration: {
          rules: [
            {
              destinations: [
                {
                  region: this.region,
                  registryId: prodAccountId,
                },
              ],
              repositoryFilters: [
                {
                  filter: repository,
                  filterType: "PREFIX_MATCH",
                },
              ],
            },
          ],
        },
      });
    }

    if (Config.isProdAccount()) {
      const devAccountId = await config.getParameterNow("DevAccountId");
      new CfnRegistryPolicy(this, "NextjsRepoReplicationPolicy", {
        policyText: {
          Version: "2008-10-17",
          Statement: [
            {
              Sid: "AllowCrossAccountECRReplication",
              Effect: "Allow",
              Principal: {
                AWS: `arn:aws:iam::${devAccountId}:root`,
              },
              Action: ["ecr:ReplicateImage"],
              Resource: [`arn:aws:ecr:${this.region}:${this.account}:repository/${repository}`],
            },
          ],
        },
      });
    }
  }
}
