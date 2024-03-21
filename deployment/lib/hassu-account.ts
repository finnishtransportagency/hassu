import { Construct } from "constructs";
import { Aws, aws_ecr, CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config, SSMParameterName } from "./config";
import { CfnDomain, Domain, EngineVersion, TLSSecurityPolicy } from "aws-cdk-lib/aws-opensearchservice";
import { AccountRootPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RepositoryEncryption, TagStatus } from "aws-cdk-lib/aws-ecr";
import { CfnDomain as CodeartifactDomain, CfnRepository as CodeartifactRepository } from "aws-cdk-lib/aws-codeartifact";
import { Topic } from "aws-cdk-lib/aws-sns";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { BastionHostLinux, InstanceInitiatedShutdownBehavior, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";

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
    if (Config.isDevAccount()) {
      await this.createBastionHost(config);
    }
  }

  private async createBastionHost(config: Config) {
    // Bastion host that allows connection from systems manager
    const vpcName = await config.getParameterNow("HassuVpcName");
    const vpc = Vpc.fromLookup(this, "Vpc", { tags: { Name: vpcName } });
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

}
