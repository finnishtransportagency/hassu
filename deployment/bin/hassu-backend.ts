#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {HassuStack} from '../lib/hassu-stack';

const app = new cdk.App();
new HassuStack(app, 'HassuStack');
