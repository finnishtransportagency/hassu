#!/usr/bin/env node
import { HassuAccountStack } from "../lib/hassu-account";
import { App } from "aws-cdk-lib";

async function main() {
  const app = new App();
  await new HassuAccountStack(app).main();

  app.synth();
}

main();
