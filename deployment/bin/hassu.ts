#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";

async function main() {
  const app = new cdk.App();
  const hassuBackendStack = new HassuBackendStack(app);
  await hassuBackendStack.process().catch((e) => {
    // tslint:disable-next-line:no-console
    console.log(e);
    process.exit(1);
  });
  const hassuFrontendStack = new HassuFrontendStack(app);
  await hassuFrontendStack.process().catch((e) => {
    // tslint:disable-next-line:no-console
    console.log(e);
    process.exit(1);
  });
}

main();
