#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";
import { HassuDatabaseStack } from "../lib/hassu-database";
import { App } from "aws-cdk-lib";
import { Config } from "../lib/config";
import { assertIsDefined } from "../../backend/src/util/assertions";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

async function main() {
  if (!Config.isDeveloperEnvironment() && Config.isNotLocalStack() && !process.env.CODEBUILD_BUILD_NUMBER) {
    throw new Error("Et voi asentaa ympäristöä '" + Config.env + "' kuin CodeBuildin kautta!");
  }

  if (!Config.isProductionEnvironment() && (Config.isProdAccount() || process.env.AWS_PROFILE?.includes("prod"))) {
    throw new Error("Et voi asentaa ympäristöä '" + Config.env + "' tuotantotiliin!");
  }
  console.log("Asennetaan ympäristöön " + Config.env);

  let awsAccountId;
  if (Config.isNotLocalStack()) {
    awsAccountId = (await new STSClient({}).send(new GetCallerIdentityCommand({}))).Account;
  } else {
    awsAccountId = "000000000000";
  }

  let nextJsImageTag: string;
  if (Config.isDeveloperEnvironment()) {
    nextJsImageTag = Config.env;
  } else {
    const commitHash = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION;
    if (commitHash) {
      nextJsImageTag = commitHash;
    } else {
      throw new Error("Et voi asentaa ympäristöä '" + Config.env + "' kuin CodeBuildin kautta!");
    }
  }

  assertIsDefined(awsAccountId, "AWS-tilin ID pitää olla tiedossa");
  const app = new App();
  const hassuDatabaseStack = new HassuDatabaseStack(app, awsAccountId);
  await hassuDatabaseStack.process().catch((e) => {
    console.log("Deployment of hassuDatabaseStack failed:", e);
    process.exit(1);
  });
  if (Config.isNotLocalStack()) {
    const hassuBackendStack = new HassuBackendStack(app, {
      awsAccountId,
      projektiTable: hassuDatabaseStack.projektiTable,
      lyhytOsoiteTable: hassuDatabaseStack.lyhytOsoiteTable,
      feedbackTable: hassuDatabaseStack.feedbackTable,
      projektiArchiveTable: hassuDatabaseStack.projektiArchiveTable,
      uploadBucket: hassuDatabaseStack.uploadBucket,
      yllapitoBucket: hassuDatabaseStack.yllapitoBucket,
      internalBucket: hassuDatabaseStack.internalBucket,
      publicBucket: hassuDatabaseStack.publicBucket,
      kiinteistonomistajaTable: hassuDatabaseStack.kiinteistonOmistajaTable,
      projektiMuistuttajaTable: hassuDatabaseStack.projektiMuistuttajaTable,
    });
    await hassuBackendStack.process().catch((e) => {
      console.log("Deployment of HassuBackendStack failed:", e);
      process.exit(1);
    });
    const hassuFrontendStack = new HassuFrontendStack(app, {
      awsAccountId,
      internalBucket: hassuDatabaseStack.internalBucket,
      yllapitoBucket: hassuDatabaseStack.yllapitoBucket,
      publicBucket: hassuDatabaseStack.publicBucket,
      projektiTable: hassuDatabaseStack.projektiTable,
      lyhytOsoiteTable: hassuDatabaseStack.lyhytOsoiteTable,
      eventQueue: hassuBackendStack.eventQueue,
      asianhallintaQueue: hassuBackendStack.asianhallintaQueue,
      nextJsImageTag,
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
