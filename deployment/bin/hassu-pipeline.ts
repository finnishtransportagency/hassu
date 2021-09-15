#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { HassuPipelineStack } from "../lib/hassu-pipeline";

async function main() {
  const app = new cdk.App();
  // tslint:disable-next-line:no-unused-expression
  await new HassuPipelineStack(app).process().catch((e) => {
    // tslint:disable-next-line:no-console
    console.log(e);
    process.exit(1);
  });
  app.synth();
}

main();
