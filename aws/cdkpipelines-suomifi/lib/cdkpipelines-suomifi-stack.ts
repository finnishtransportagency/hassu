import * as apigw from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as loadbalance from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import * as ecs from '@aws-cdk/aws-ecs';
import * as logs from '@aws-cdk/aws-logs';
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

    // 1. Get HASSU VPC
    const vpcId = ssm.StringParameter.fromStringParameterAttributes(this, 'vpc-ssm-parameter', {
      parameterName: 'HassuVpcId'
    }).stringValue
    
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: 'vpc-0689ac0f1efc74993'
    });

    // 2. ALB
    const sgId = ssm.StringParameter.fromStringParameterAttributes(this, 'sg-ssm-parameter', {
      parameterName: 'HassuSgId'
    }).stringValue;

    const securityGroup = ec2.SecurityGroup.fromLookup(this, 'HassuSG', 'sg-0b57a0a831ff31953');

    const alb = new loadbalance.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: false,
      vpcSubnets: {onePerAz: true},
      http2Enabled: true,
      securityGroup
    });
    
    // 3. ECS Cluster, Service, Task, Container, LogGroup
    const cluster = new ecs.Cluster(this, 'ECSCluster', {
      vpc: vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256
    });

    const keycloakUserParam = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'KeycloakUserParam', {
      parameterName: 'HassuKeycloakUser',
      version: 1
    });

    const keycloakPasswordParam = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'KeycloakPasswordParam', {
      parameterName: 'HassuKeycloakPassword',
      version: 1
    });

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: '/ecs/hassu-suomifi',
      retention: logs.RetentionDays.TWO_WEEKS
    });
    
    const container = taskDefinition.addContainer('KeycloakContainer', {
      image: ecs.ContainerImage.fromRegistry("jboss/keycloak"),
      environment: {
        ENV: 'dev',
        FOO: 'bar'
      },
      secrets: {
        KEYClOAK_USER: ecs.Secret.fromSsmParameter(keycloakUserParam),
        KEUCLOAK_PASSWORD: ecs.Secret.fromSsmParameter(keycloakPasswordParam)
      },
      portMappings:[{ containerPort: 8080 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: '/ecs/hassu-suomifi/'
      })
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 2
    });

    const listener = alb.addListener('Listener', { port: 80});
    const targetGroup = listener.addTargets('ECS', {
      port: 80,
      targets: [service.loadBalancerTarget({
        containerName: 'KeycloakContainer',
        containerPort: 8080
      })]
    })

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