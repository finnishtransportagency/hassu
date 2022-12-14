#!/usr/bin/env node
import { HassuPipelineStack } from "../lib/hassu-pipelines";
import { App } from "aws-cdk-lib";

async function main() {
  const app = new App();
  // tslint:disable-next-line:no-unused-expression
  await new HassuPipelineStack(app).process().catch((e) => {
    // tslint:disable-next-line:no-console
    console.log(e);
    process.exit(1);
  });
  app.synth();
}

main();
