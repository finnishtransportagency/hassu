#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { HassuPipelineStack } from "../lib/hassu-pipeline";

async function main() {
  const app = new cdk.App();
  // tslint:disable-next-line:no-unused-expression
  const branch = process.env.GIT_BRANCH;
  if (!branch) {
    throw new Error("GIT_BRANCH environemnt variable must be defined.");
  }
  await new HassuPipelineStack(app, branch).process();
  app.synth();
}

main();
