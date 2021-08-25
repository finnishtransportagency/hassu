import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import { CdkpipelinesSuomifiStack } from './cdkpipelines-suomifi-stack';

/**
 * Deployable unit of web service app
 */
export class CdkpipelinesSuomifiStage extends Stage {
  public readonly urlOutput: CfnOutput;
  
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const service = new CdkpipelinesSuomifiStack(this, 'WebService');
    
    // Expose CdkpipelinesSuomifiStack's output one level higher
    this.urlOutput = service.urlOutput;
  }
}