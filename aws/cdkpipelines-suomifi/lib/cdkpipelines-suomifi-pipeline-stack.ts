import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, ShellStep } from "@aws-cdk/pipelines";

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
         input: CodePipelineSource.gitHub('finnishtransportagency/hassu', 'main'),
         
         // Install dependencies, build and run cdk synth
         commands: [
            'cd aws',
            'cd cdkpipelines-suomifi',
            'npm ci',
            'npm run build',
            'npx cdk synth'
         ],
       }),
    });

    // This is where we add the application stages
    // ...
  }
}