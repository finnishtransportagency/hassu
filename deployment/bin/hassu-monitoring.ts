#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { HassuMonitoringStack } from "../lib/hassu-monitoring";

async function main() {
  const app = new App();
  const stack = new HassuMonitoringStack(app);
  await stack.process();
  app.synth();
}

main();
