import { Construct } from "@aws-cdk/core";
import { Domain } from "@aws-cdk/aws-opensearchservice";
import { Config } from "./config";
import { AccountStackOutputs } from "./hassu-account";

export async function getOpenSearchDomain(scope: Construct, accountStackOutputs: AccountStackOutputs) {
  if (Config.env !== "localstack") {
    return Domain.fromDomainAttributes(scope, "DomainEndPoint", {
      domainEndpoint: accountStackOutputs.SearchDomainEndpointOutput,
      domainArn: accountStackOutputs.SearchDomainArnOutput,
    });
  } else {
    return Domain.fromDomainEndpoint(scope, "DomainEndPoint", "http://not-used-with-localstack");
  }
}
