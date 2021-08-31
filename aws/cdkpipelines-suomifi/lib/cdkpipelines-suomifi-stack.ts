import * as apigw from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as loadbalance from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import { CfnOutput, Construct, Stack, StackProps } from '@aws-cdk/core';
import * as path from 'path';
import { AlarmBase } from '@aws-cdk/aws-cloudwatch';

/**
 * A stack for our simple Lambda-powered web service
 */
export class CdkpipelinesSuomifiStack extends Stack {
  /**
   * The URL of the API Gateway endpoint, for use in the integ tests
   */
  public readonly urlOutput: CfnOutput;
 
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 0. Get HASSU VPC
    const vpcId = ssm.StringParameter.fromStringParameterAttributes(this, 'vpc-ssm-parameter', {
      parameterName: 'HassuVpcId'
    }).stringValue
    
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: vpcId
    });

    // SG
    const sgId = ssm.StringParameter.fromStringParameterAttributes(this, 'sg-ssm-parameter', {
      parameterName: 'HassuSgId'
    }).stringValue;

    const securityGroup = ec2.SecurityGroup.fromLookup(this, 'HassuSG', sgId);

    // 1. ALB
    const alb = new loadbalance.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: false,
      vpcSubnets: {onePerAz: true},
      http2Enabled: true,
      securityGroup
    });
    
    // 2. ECS Cluster, Service, Task

    // 3. RDS

    // 4. AppMesh

    // 5. CloudMap

    // The Lambda function that contains the functionality
    const handler = new lambda.Function(this, 'Lambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, 'lambda')),
    });

    // An API Gateway to make the Lambda web-accessible
    const gw = new apigw.LambdaRestApi(this, 'Gateway', {
      description: 'Endpoint for a simple Lambda-powered web service',
      handler,
    });

    this.urlOutput = new CfnOutput(this, 'Url', {
      value: gw.url,
    });
  }
}