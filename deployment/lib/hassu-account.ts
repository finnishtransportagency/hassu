import { Construct } from "constructs";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import { Domain, EngineVersion } from "aws-cdk-lib/aws-opensearchservice";
import { OpenSearchAccessPolicy } from "aws-cdk-lib/aws-opensearchservice/lib/opensearch-access-policy";
import { AccountRootPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

// These should correspond to CfnOutputs produced by this stack
export type AccountStackOutputs = {
  SearchDomainEndpointOutput: string;
  SearchDomainArnOutput: string;
};

export class HassuAccountStack extends Stack {
  public readonly searchDomain: Domain;

  constructor(scope: Construct) {
    super(scope, "account", {
      stackName: "hassu-account",
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });

    if (!Config.isDevAccount() && !Config.isProdAccount()) {
      throw new Error("Only dev and prod accounts are supported");
    }

    this.searchDomain = new Domain(this, "SearchDomain", {
      domainName: "hassu-search",
      version: EngineVersion.OPENSEARCH_1_0,
      enableVersionUpgrade: true,
      capacity: {
        masterNodes: 0,
        dataNodes: 2,
        dataNodeInstanceType: "t3.small.search",
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new OpenSearchAccessPolicy(this, "OpenSearchAccessPolicy", {
      domainName: this.searchDomain.domainName,
      domainArn: this.searchDomain.domainArn,
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["es:ESHttpGet", "es:ESHttpPut", "es:ESHttpPost", "es:ESHttpDelete"],
          principals: [new AccountRootPrincipal().grantPrincipal],
          resources: [this.searchDomain.domainArn],
        }),
      ],
    });

    new CfnOutput(this, "SearchDomainEndpointOutput", {
      value: this.searchDomain.domainEndpoint || "",
    });
    new CfnOutput(this, "SearchDomainArnOutput", {
      value: this.searchDomain.domainArn || "",
    });
  }
}
