#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";
import { HassuDatabaseStack } from "../lib/hassu-database";
import { App } from "aws-cdk-lib";
import { Config } from "../lib/config";

async function main() {
  if (!Config.isDeveloperEnvironment() && Config.isNotLocalStack() && !process.env.CODEBUILD_BUILD_NUMBER) {
    throw new Error("Et voi asentaa ympäristöä '" + Config.env + "' kuin CodeBuildin kautta!");
  }

  const app = new App();
  const hassuDatabaseStack = new HassuDatabaseStack(app);
  await hassuDatabaseStack.process().catch((e) => {
    console.log("Deployment of hassuDatabaseStack failed:", e);
    process.exit(1);
  });
  if (Config.isNotLocalStack()) {
    const hassuBackendStack = new HassuBackendStack(app, {
      projektiTable: hassuDatabaseStack.projektiTable,
      lyhytOsoiteTable: hassuDatabaseStack.lyhytOsoiteTable,
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
      yllapitoBucket: hassuDatabaseStack.yllapitoBucket,
      publicBucket: hassuDatabaseStack.publicBucket,
      projektiTable: hassuDatabaseStack.projektiTable,
      lyhytOsoiteTable: hassuDatabaseStack.lyhytOsoiteTable,
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
