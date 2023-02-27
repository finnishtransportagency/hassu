#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { HassuMonitoringStack } from "../lib/hassu-monitoring";

async function main() {
  const app = new App();
  const stack = new HassuMonitoringStack(app);
  await stack.process().catch((e) => {
    console.log("Deployment of HassuMonitoringStack failed:", e);
    process.exit(1);
  });
  app.synth();
}

main();
