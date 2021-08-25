#!/usr/bin/env node
import { App } from '@aws-cdk/core';
import { CdkpipelinesSuomifiPipelineStack } from '../lib/cdkpipelines-suomifi-pipeline-stack';

const app = new App();

new CdkpipelinesSuomifiPipelineStack(app, 'CdkpipelinesSuomfiPipelineStack', {
  env: { account: '283563576583', region: 'eu-west-1' },
});

app.synth();