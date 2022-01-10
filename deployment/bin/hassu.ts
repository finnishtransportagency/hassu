#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";
import { HassuDatabaseStack } from "../lib/hassu-database";
import { HassuSearchStack } from "../lib/hassu-search";

async function main() {
  const app = new cdk.App();
  const hassuDatabaseStack = new HassuDatabaseStack(app);
  await hassuDatabaseStack.process().catch((e) => {
    console.log("Deployment of hassuDatabaseStack failed:", e);
    process.exit(1);
  });
  const hassuSearchStack = new HassuSearchStack(app);
  const hassuBackendStack = new HassuBackendStack(app, {
    projektiTable: hassuDatabaseStack.projektiTable,
    searchDomain: hassuSearchStack.searchDomain,
    uploadBucket: hassuDatabaseStack.uploadBucket,
    yllapitoBucket: hassuDatabaseStack.yllapitoBucket,
    internalBucket: hassuDatabaseStack.internalBucket,
  });
  await hassuBackendStack.process().catch((e) => {
    console.log("Deployment of HassuBackendStack failed:", e);
    process.exit(1);
  });
  const hassuFrontendStack = new HassuFrontendStack(app, { internalBucket: hassuDatabaseStack.internalBucket });
  await hassuFrontendStack.process().catch((e) => {
    console.log("Deployment of HassuFrontendStack failed:", e);
    process.exit(1);
  });
}

main().catch((e) => {
  console.log("Deployment of Hassu failed:", e);
  process.exit(1);
});
