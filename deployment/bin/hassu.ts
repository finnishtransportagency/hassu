#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";
import { HassuDatabaseStack } from "../lib/hassu-database";
import { App } from "aws-cdk-lib";
import { Config } from "../lib/config";
import AWS from "aws-sdk";

AWS.config.logger = console;

async function main() {
  const app = new App();
  const hassuDatabaseStack = new HassuDatabaseStack(app);
  await hassuDatabaseStack.process().catch((e) => {
    console.log("Deployment of hassuDatabaseStack failed:", e);
    process.exit(1);
  });
  if (Config.env !== "localstack") {
    const hassuBackendStack = new HassuBackendStack(app, {
      projektiTable: hassuDatabaseStack.projektiTable,
      feedbackTable: hassuDatabaseStack.feedbackTable,
      projektiArchiveTable: hassuDatabaseStack.projektiArchiveTable,
      uploadBucket: hassuDatabaseStack.uploadBucket,
      yllapitoBucket: hassuDatabaseStack.yllapitoBucket,
      internalBucket: hassuDatabaseStack.internalBucket,
      publicBucket: hassuDatabaseStack.publicBucket,
    });
    await hassuBackendStack.process().catch((e) => {
      console.log("Deployment of HassuBackendStack failed:", e);
      process.exit(1);
    });
    const hassuFrontendStack = new HassuFrontendStack(app, {
      internalBucket: hassuDatabaseStack.internalBucket,
      projektiTable: hassuDatabaseStack.projektiTable,
      aineistoImportQueue: hassuBackendStack.aineistoImportQueue,
    });
    await hassuFrontendStack.process().catch((e) => {
      console.log("Deployment of HassuFrontendStack failed:", e);
      process.exit(1);
    });
  }
}

main().catch((e) => {
  console.log("Deployment of Hassu failed:", e);
  process.exit(1);
});
