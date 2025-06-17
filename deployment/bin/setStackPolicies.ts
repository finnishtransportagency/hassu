import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { Config } from "../lib/config";
import { backendStackName } from "../lib/hassu-backend";
import { databaseStackName } from "../lib/hassu-database";
import { frontendStackName } from "../lib/hassu-frontend";
import { accountStackName } from "../lib/hassu-account";

function createPolicy(terminationProtection: boolean): string {
  const allowAllPolicy = {
    Effect: "Allow",
    Action: "Update:*",
    Principal: "*",
    Resource: "*",
  };
  let statements;
  // Policyjä ei pysty poistamaan, ne voi vain asettaa Allow all-tyyppiseksi
  if (terminationProtection) {
    statements = [
      {
        Effect: "Deny",
        Action: ["Update:Delete", "Update:Replace"],
        Principal: "*",
        Resource: "*",
        Condition: {
          StringEquals: {
            ResourceType: [
              "AWS::DynamoDB::Table",
              "AWS::CloudFront::Distribution",
              "AWS::AppSync::GraphQLApi",
              "AWS::OpenSearchService::Domain",
            ],
          },
        },
      },
      allowAllPolicy,
    ];
  } else {
    statements = [allowAllPolicy];
  }
  return JSON.stringify({
    Statement: statements,
  });
}

async function main() {
  const cfEuWest1 = new CloudFormation({ region: "eu-west-1" });
  const cfUsEast1 = new CloudFormation({ region: "us-east-1" });
  const stackPolicyBody = createPolicy(Config.getEnvConfig().terminationProtection || false);

  await Promise.all([
    cfEuWest1.setStackPolicy({
      StackName: accountStackName,
      StackPolicyBody: stackPolicyBody,
    }),
    cfEuWest1.setStackPolicy({
      StackName: backendStackName,
      StackPolicyBody: stackPolicyBody,
    }),
    cfEuWest1.setStackPolicy({
      StackName: databaseStackName,
      StackPolicyBody: stackPolicyBody,
    }),
    cfUsEast1.setStackPolicy({
      StackName: frontendStackName,
      StackPolicyBody: stackPolicyBody,
    }),
  ]);
}

main().then();
