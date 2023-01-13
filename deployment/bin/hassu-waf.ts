#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { FrontendWafStack } from "../lib/hassu-waf";

async function main() {
  const app = new App();
  new FrontendWafStack(app);

  app.synth();
}

main();
