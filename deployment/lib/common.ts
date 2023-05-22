import { Construct } from "constructs";
import { Domain } from "aws-cdk-lib/aws-opensearchservice";
import { Config } from "./config";
import { AccountStackOutputs } from "./hassu-account";
import { Stack } from "aws-cdk-lib";
import * as resourcegroups from "aws-cdk-lib/aws-resourcegroups";
import { IDomain } from "aws-cdk-lib/aws-opensearchservice/lib/domain";

export async function getOpenSearchDomain(scope: Construct, accountStackOutputs: AccountStackOutputs): Promise<IDomain> {
  if (Config.isNotLocalStack()) {
    return Domain.fromDomainAttributes(scope, "DomainEndPoint", {
      domainEndpoint: accountStackOutputs.SearchDomainEndpointOutput,
      domainArn: accountStackOutputs.SearchDomainArnOutput,
    });
  } else {
    return Domain.fromDomainEndpoint(scope, "DomainEndPoint", "http://not-used-with-localstack");
  }
}

export function createResourceGroup(stack: Stack): void {
  const stackName = stack.stackName;
  new resourcegroups.CfnGroup(stack, stackName + "-resourcegroup", {
    name: stackName,
    tags: Config.tagsArray,
  });
}
