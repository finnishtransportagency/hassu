/* tslint:disable:no-unused-expression */
import * as cdk from "@aws-cdk/core";
import { Construct, RemovalPolicy } from "@aws-cdk/core";
import { Config } from "./config";
import { Domain, EngineVersion } from "@aws-cdk/aws-opensearchservice";

export class HassuSearchStack extends cdk.Stack {
  public readonly searchDomain: Domain;

  constructor(scope: Construct) {
    const domainName = "hassu-search-" + Config.env;
    super(scope, "search", {
      stackName: domainName,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });

    let removalPolicy: cdk.RemovalPolicy;
    if (Config.isPermanentEnvironment()) {
      removalPolicy = RemovalPolicy.RETAIN;
    } else {
      removalPolicy = RemovalPolicy.DESTROY;
    }
    this.searchDomain = new Domain(this, "SearchDomain", {
      domainName,
      version: EngineVersion.OPENSEARCH_1_0,
      enableVersionUpgrade: true,
      capacity: {
        masterNodes: 0,
        dataNodes: 1,
        dataNodeInstanceType: "t3.small.search",
      },
      removalPolicy,
    });

    new cdk.CfnOutput(this, "SearchDomainOutput", {
      value: this.searchDomain.domainEndpoint || "",
    });
  }
}
