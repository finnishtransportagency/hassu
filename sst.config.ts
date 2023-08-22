import { SSTConfig } from "sst";
import { NextjsSite } from "sst/constructs";
import { Config } from "./deployment/lib/config";
import { StackContext } from "sst/constructs/FunctionalStack";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  LambdaEdgeEventType,
  OriginRequestPolicy,
  OriginSslPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import { CompositePrincipal, Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { EdgeFunction } from "aws-cdk-lib/aws-cloudfront/lib/experimental";
import { Fn } from "aws-cdk-lib";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { readFileSync } from "fs";
import { Stack } from "sst/constructs/Stack";

export default {
  config(_input) {
    return {
      name: "hassu-mikko",
      region: "us-east-1",
      stage: "mikko",
      bootstrap: {
        stackName: "hassu-mikko-bootstrap"
      }
    };
  },
  async stacks(app) {
    await app.stack(FrontendStack);
  }
} satisfies SSTConfig;

async function createDistributionProperties(
  dmzProxyBehaviorWithLambda: BehaviorOptions
): Promise<Record<string, BehaviorOptions>> {
  return {
    "/oauth2/*": dmzProxyBehaviorWithLambda,
    "/graphql": dmzProxyBehaviorWithLambda,
    "/yllapito/graphql": dmzProxyBehaviorWithLambda,
    "/yllapito/kirjaudu": dmzProxyBehaviorWithLambda
  };
}

export async function FrontendStack({ stack }: StackContext) {
  const env = Config.env;
  const config = await Config.instance(stack);

  const edgeFunctionRole = createEdgeFunctionRole(stack);

  const frontendRequestFunction = createFrontendRequestFunction(
    stack,
    env,
    config.basicAuthenticationUsername,
    config.basicAuthenticationPassword,
    edgeFunctionRole
  );

  const dmzProxyBehaviorWithLambda = createDmzProxyBehavior(config.dmzProxyEndpoint, frontendRequestFunction);
  const distributionProperties = await createDistributionProperties(dmzProxyBehaviorWithLambda);
  const site = new NextjsSite(stack, "hassu-frontend2-mikko", {
    path: ".",
    edge: true,
    runtime: "nodejs18.x",
    cdk: {
      distribution: {
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        additionalBehaviors: distributionProperties
      }
    }

  });

  stack.addOutputs({
                     SiteUrl: site.url
                   });

}

function createDmzProxyBehavior(dmzProxyEndpoint: string, frontendRequestFunction?: cloudfront.experimental.EdgeFunction) {
  const dmzBehavior: BehaviorOptions = {
    compress: true,
    origin: new HttpOrigin(dmzProxyEndpoint, {
      originSslProtocols: [OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1_2, OriginSslPolicy.TLS_V1, OriginSslPolicy.SSL_V3]
    }),
    cachePolicy: CachePolicy.CACHING_DISABLED,
    originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
    allowedMethods: AllowedMethods.ALLOW_ALL,
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    edgeLambdas: frontendRequestFunction
      ? [{ functionVersion: frontendRequestFunction.currentVersion, eventType: LambdaEdgeEventType.VIEWER_REQUEST }]
      : []
  };

  return dmzBehavior;
}

function createFrontendRequestFunction(
  scope: Construct,
  env: string,
  basicAuthenticationUsername: string,
  basicAuthenticationPassword: string,
  role: Role
): EdgeFunction | undefined {
  if (env !== "prod") {
    const sourceCode = readFileSync(`deployment/lib/lambda/frontendRequest.js`).toString("utf-8");
    const functionCode = Fn.sub(sourceCode, {
      BASIC_USERNAME: basicAuthenticationUsername,
      BASIC_PASSWORD: basicAuthenticationPassword,
      ENVIRONMENT: Config.env
    });
    return new cloudfront.experimental.EdgeFunction(scope, "sstfrontendRequestFunction", {
      runtime: Runtime.NODEJS_18_X,
      functionName: "sstfrontendRequestFunction" + env,
      code: Code.fromInline(functionCode),
      handler: "index.handler",
      role
    });
  }
}

function createEdgeFunctionRole(stack: Stack) {
  return new Role(stack, "edgeFunctionRole", {
    assumedBy: new CompositePrincipal(
      new ServicePrincipal("lambda.amazonaws.com"),
      new ServicePrincipal("edgelambda.amazonaws.com"),
      new ServicePrincipal("logger.cloudfront.amazonaws.com")
    ),
    managedPolicies: [
      ManagedPolicy.fromManagedPolicyArn(stack, "NextApiLambdaPolicy", "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")
    ],
    inlinePolicies: {
      xray: new PolicyDocument({
                                 statements: [
                                   new PolicyStatement({
                                                         effect: Effect.ALLOW,
                                                         actions: ["xray:*"],
                                                         resources: ["*"]
                                                       })
                                 ]
                               })
    }
  });
}
