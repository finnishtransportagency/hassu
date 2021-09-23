#!/usr/bin/env node
/* tslint:disable:no-unused-expression */
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";

async function main() {
  const app = new cdk.App();
  const hassuBackendStack = new HassuBackendStack(app);
  await hassuBackendStack.process();
  new HassuFrontendStack(app);
}

main();
