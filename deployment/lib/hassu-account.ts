import { Construct } from "constructs";
import { aws_ecr, CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config, SSMParameterName } from "./config";
import { Domain, EngineVersion } from "aws-cdk-lib/aws-opensearchservice";
import { AccountRootPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RepositoryEncryption } from "aws-cdk-lib/aws-ecr";
import { Topic } from "aws-cdk-lib/aws-sns";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

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
      },
      tags: Config.tags,
    });

    if (!Config.isDevAccount() && !Config.isProdAccount()) {
      throw new Error("Only dev and prod accounts are supported");
    }
    this.configureOpenSearch();
    this.configureBuildImageECR();
    this.configureSNSForAlarms();
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
      removalPolicy: RemovalPolicy.RETAIN,
    });

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
    });
  }

  private configureSNSForAlarms() {
    const topic = new Topic(this, "SNSForAlarms", {
      fifo: false,
      displayName: "Email-hälytykset CloudWatchista",
      topicName: "hassualarms",
    });
    new StringParameter(this, "SNSForAlarmsArn", {
      parameterName: SSMParameterName.HassuAlarmsSNSArn,
      stringValue: topic.topicArn,
    });
  }
}
