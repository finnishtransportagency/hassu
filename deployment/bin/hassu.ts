#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";
import { HassuDatabaseStack } from "../lib/hassu-database";

async function main() {
  const app = new cdk.App();
  const hassuDatabaseStack = new HassuDatabaseStack(app);
  const hassuBackendStack = new HassuBackendStack(app, hassuDatabaseStack.projektiTable);
  await hassuBackendStack.process().catch((e) => {
    console.log("Deployment of HassuBackendStack failed:", e);
    process.exit(1);
  });
  const hassuFrontendStack = new HassuFrontendStack(app);
  await hassuFrontendStack.process().catch((e) => {
    console.log("Deployment of HassuFrontendStack failed:", e);
    process.exit(1);
  });
}

main();
