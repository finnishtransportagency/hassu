#!/usr/bin/env node
/* tslint:disable:no-unused-expression */
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { HassuBackendStack } from "../lib/hassu-backend";
import { HassuFrontendStack } from "../lib/hassu-frontend";

const app = new cdk.App();
new HassuBackendStack(app);
new HassuFrontendStack(app);
