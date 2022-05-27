#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { HassuAccountStack } from "../lib/hassu-account";

async function main() {
  const app = new cdk.App();
  // tslint:disable-next-line:no-unused-expression
  new HassuAccountStack(app);
  app.synth();
}

main();
