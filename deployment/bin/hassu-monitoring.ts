#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { HassuMonitoringStack } from "../lib/hassu-monitoring";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

async function main() {
  const app = new App();
  const awsAccountId = (await new STSClient({}).send(new GetCallerIdentityCommand({}))).Account ?? "000000000000";
  const stack = new HassuMonitoringStack(app, awsAccountId);
  await stack.process().catch((e) => {
    console.log("Deployment of HassuMonitoringStack failed:", e);
    process.exit(1);
  });
  app.synth();
}

main();
