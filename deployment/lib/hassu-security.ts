// Contains code generated or recommended by Amazon Q
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CfnMalwareProtectionPlan } from "aws-cdk-lib/aws-guardduty";
import * as macie from "aws-cdk-lib/aws-macie";
import * as kms from "aws-cdk-lib/aws-kms";
import { SSMParameterName } from "./config";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";

interface SecurityScanningProps {
  stack: Stack;
  yllapitoBucket: Bucket;
}

export function createQuarantineBucket(stack: Stack): Bucket {
  return new Bucket(stack, "QuarantineBucket", {
    bucketName: Config.quarantineBucketName,
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    removalPolicy: RemovalPolicy.DESTROY,
    encryption: BucketEncryption.S3_MANAGED,
    enforceSSL: true,
    lifecycleRules: [{ id: stack.stackName + "-quarantine-delete-after-90d", expiration: Duration.days(90) }],
  });
}

export async function setupSecurityScanning(props: SecurityScanningProps): Promise<Bucket> {
  const { stack, yllapitoBucket } = props;

  const quarantineBucket = createQuarantineBucket(stack);

  const alarmTopicArn = StringParameter.valueForStringParameter(stack, SSMParameterName.HassuAlarmsSNSArn);
  const alertTopic = sns.Topic.fromTopicArn(stack, "SecurityAlertTopic", alarmTopicArn);

  await createMalwareProtectionForS3(stack, yllapitoBucket, quarantineBucket, alertTopic);
  createMacieSensitiveDataScanning(stack, yllapitoBucket, alertTopic);

  return quarantineBucket;
}

async function createMalwareProtectionForS3(stack: Stack, bucket: Bucket, quarantineBucket: Bucket, alertTopic: sns.ITopic) {
  const scanRole = new Role(stack, "GuardDutyMalwareScanRole", {
    assumedBy: new ServicePrincipal("malware-protection-plan.guardduty.amazonaws.com"),
  });
  bucket.grantRead(scanRole);
  scanRole.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:PutBucketNotification", "s3:GetBucketNotification"],
      resources: [bucket.bucketArn],
    })
  );
  scanRole.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:PutObject", "s3:GetObjectTagging", "s3:PutObjectTagging"],
      resources: [bucket.arnForObjects("*")],
    })
  );
  scanRole.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["events:PutRule", "events:PutTargets", "events:DeleteRule", "events:RemoveTargets"],
      resources: ["*"],
    })
  );

  const malwareProtectionPlan = new CfnMalwareProtectionPlan(stack, "S3MalwareProtection", {
    role: scanRole.roleArn,
    protectedResource: {
      s3Bucket: {
        bucketName: bucket.bucketName,
      },
    },
    actions: {
      tagging: { status: "ENABLED" },
    },
  });
  malwareProtectionPlan.node.addDependency(scanRole);

  const quarantineLambda = new lambda.Function(stack, "MalwareQuarantineLambda", {
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "guarddutyMalwareQuarantine.handler",
    code: lambda.Code.fromAsset("deployment/lib/lambda"),
    environment: {
      SOURCE_BUCKET: bucket.bucketName,
      QUARANTINE_BUCKET: quarantineBucket.bucketName,
    },
    timeout: Duration.seconds(30),
  });
  bucket.grantReadWrite(quarantineLambda);
  bucket.grantDelete(quarantineLambda);
  quarantineBucket.grantWrite(quarantineLambda);

  new events.Rule(stack, "GuardDutyMalwareScanRule", {
    eventPattern: {
      source: ["aws.guardduty"],
      detailType: ["GuardDuty Malware Protection Object Scan Result"],
      detail: {
        scanResultDetails: {
          scanResultStatus: ["THREATS_FOUND"],
        },
      },
    },
    targets: [
      new targets.LambdaFunction(quarantineLambda),
      new targets.SnsTopic(alertTopic, {
        message: events.RuleTargetInput.fromMultilineText(
          `[${Config.env}] MALWARE DETECTED IN S3

Bucket: ${events.EventField.fromPath("$.detail.s3ObjectDetails.bucketName")}
Object: ${events.EventField.fromPath("$.detail.s3ObjectDetails.objectKey")}
Scan result: ${events.EventField.fromPath("$.detail.scanResultDetails.scanResultStatus")}
Threats: ${events.EventField.fromPath("$.detail.scanResultDetails.threats")}

Action taken: object moved to quarantine bucket and deleted from source.

Time: ${events.EventField.time}
Account: ${events.EventField.account}
Region: ${events.EventField.region}`
        ),
      }),
    ],
  });
}

function createMacieSensitiveDataScanning(stack: Stack, bucket: Bucket, alertTopic: sns.ITopic) {
  // Macie is only enabled on the dev account. Prod account has no Macie session.
  if (!Config.isDevAccount()) {
    return;
  }
  // Macie Session is created in hassu-account stack (account-level resource).
  // It must be deployed before this stack's Macie resources can function.
  // Custom identifier for Finnish personal identity codes (henkilötunnus)
  const finnishPersonalIdIdentifier = new macie.CfnCustomDataIdentifier(stack, "FinnishPersonalIdIdentifier", {
    name: `FinnishPersonalIdentityCode-${Config.env}`,
    regex: "\\b\\d{6}[+\\-A]\\d{3}[0-9A-FHJ-NPR-Y]\\b",
    description: "Detects Finnish personal identity codes (henkilötunnus format: DDMMYY+/-A###X)",
  });

  // KMS key for Macie findings bucket — Macie requires KMS when configuring findings repository
  const macieFindingsKey = new kms.Key(stack, "MacieFindingsKey", {
      alias: `${Config.env}-macie-findings-key`,
      description: "KMS key for Macie sensitive data discovery results",
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
  });
  macieFindingsKey.addToResourcePolicy(
      new PolicyStatement({
        sid: "AllowMacieToUseKey",
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("macie.amazonaws.com")],
        actions: ["kms:GenerateDataKey", "kms:Encrypt"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": [
              `arn:aws:macie2:${stack.region}:${stack.account}:export-configuration:*`,
              `arn:aws:macie2:${stack.region}:${stack.account}:classification-job/*`,
            ],
          },
        },
      })
  );

  // Macie findings repository bucket
  const macieFindingsBucket = new Bucket(stack, "MacieFindingsBucket", {
      bucketName: `${Config.env}-macie-findings-${stack.account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS,
      encryptionKey: macieFindingsKey,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ id: "delete-old-findings", expiration: Duration.days(90) }],
  });

  macieFindingsBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: "AllowMacieGetBucketLocation",
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("macie.amazonaws.com")],
        actions: ["s3:GetBucketLocation"],
        resources: [macieFindingsBucket.bucketArn],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": [
              `arn:aws:macie2:${stack.region}:${stack.account}:export-configuration:*`,
              `arn:aws:macie2:${stack.region}:${stack.account}:classification-job/*`,
            ],
          },
        },
      })
  );
  macieFindingsBucket.addToResourcePolicy(
    new PolicyStatement({
      sid: "AllowMaciePutObject",
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("macie.amazonaws.com")],
        actions: ["s3:PutObject"],
        resources: [macieFindingsBucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
          ArnLike: {
            "aws:SourceArn": [
              `arn:aws:macie2:${stack.region}:${stack.account}:export-configuration:*`,
              `arn:aws:macie2:${stack.region}:${stack.account}:classification-job/*`,
            ],
          },
        },
      })
  );

  // CfnFindingsPublicationConfiguration is not available in aws-cdk-lib, so we use AwsCustomResource.
  const configureFindingsRepo = new AwsCustomResource(stack, "MacieConfigureFindingsRepository", {
      onUpdate: {
        service: "Macie2",
        action: "putClassificationExportConfiguration",
        parameters: {
          configuration: {
            s3Destination: {
              bucketName: macieFindingsBucket.bucketName,
              kmsKeyArn: macieFindingsKey.keyArn,
            },
          },
        },
        physicalResourceId: PhysicalResourceId.of("MacieConfigureFindingsRepository"),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
  });
  configureFindingsRepo.node.addDependency(macieFindingsBucket);
  configureFindingsRepo.node.addDependency(macieFindingsKey);

  // Weekly scheduled classification job for sensitive data scanning
  const macieJobLambda = new lambda.Function(stack, "MacieClassificationJobLambda", {
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "macieSensitiveData.handler",
    code: lambda.Code.fromAsset("deployment/lib/lambda"),
    environment: {
      BUCKET_NAME: bucket.bucketName,
      ACCOUNT_ID: stack.account,
      CUSTOM_DATA_IDENTIFIER_ID: finnishPersonalIdIdentifier.attrId,
    },
    timeout: Duration.seconds(30),
  });
  macieJobLambda.addToRolePolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["macie2:CreateClassificationJob"],
      resources: ["*"],
    })
  );

  new events.Rule(stack, "MacieWeeklyScanRule", {
    description: "Triggers Macie sensitive data scan weekly on Monday",
    schedule: events.Schedule.cron({ minute: "0", hour: "3", weekDay: "MON" }),
    targets: [new targets.LambdaFunction(macieJobLambda)],
  });

  // Alert on sensitive data findings — filter by this environment's bucket to avoid duplicate alerts across environments
  new events.Rule(stack, "MacieFindingsRule", {
    eventPattern: {
      source: ["aws.macie"],
      detailType: ["Macie Finding"],
      detail: {
        type: [
          "SensitiveData:S3Object/Personal",
          "SensitiveData:S3Object/Financial",
          "SensitiveData:S3Object/Credentials",
          "SensitiveData:S3Object/CustomIdentifier",
        ],
        resourcesAffected: {
          s3Bucket: {
            name: [Config.yllapitoBucketName],
          },
        },
      },
    },
    targets: [
      new targets.SnsTopic(alertTopic, {
        message: events.RuleTargetInput.fromMultilineText(
          `[${Config.env}] SENSITIVE DATA DETECTED IN S3

Bucket: ${events.EventField.fromPath("$.detail.resourcesAffected.s3Bucket.name")}
Object: ${events.EventField.fromPath("$.detail.resourcesAffected.s3Object.key")}
Finding Type: ${events.EventField.fromPath("$.detail.type")}
Severity: ${events.EventField.fromPath("$.detail.severity.description")}

Categories: ${events.EventField.fromPath("$.detail.category")}

Time: ${events.EventField.time}
Account: ${events.EventField.account}
Region: ${events.EventField.region}`
        ),
      }),
    ],
  });
}
