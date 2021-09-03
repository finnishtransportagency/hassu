import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from "@aws-cdk/pipelines";
import { CdkpipelinesSuomifiStage } from './cdkpipelines-suomifi-stage';

/**
 * The stack that defines the application pipeline
 */
export class CdkpipelinesSuomifiPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      // The pipeline name
      pipelineName: 'HassuSuomifiPipeline',

       // How it will be built and synthesized
       synth: new ShellStep('Synth', {
         // Where the source can be found
         input: CodePipelineSource.gitHub('finnishtransportagency/hassu', 'feature/suomifi-deployment'),
         
         // Install dependencies, build and run cdk synth
         commands: [
            'cd aws',
            'cd cdkpipelines-suomifi',
            'npm ci',
            'npm run build',
            'npx cdk synth'
         ],
         primaryOutputDirectory: './aws/cdkpipelines-suomifi/cdk.out'
       }),
    });

    // This is where we add the application stages
    // ...
    pipeline.addStage(new CdkpipelinesSuomifiStage(this, 'Dev', {
      env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
    }));
  }
}