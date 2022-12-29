#!/usr/bin/env node
import { HassuAccountStack } from "../lib/hassu-account";
import { App } from "aws-cdk-lib";

async function main() {
  const app = new App();
  new HassuAccountStack(app);

  app.synth();
}

main();
