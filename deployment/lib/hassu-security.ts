// Contains code generated or recommended by Amazon Q
import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CfnMalwareProtectionPlan } from "aws-cdk-lib/aws-guardduty";
import * as macie from "aws-cdk-lib/aws-macie";
import { SSMParameterName } from "./config";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

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
  // Macie Session is an account-level resource that must already exist in the account.
  // It cannot be created via CloudFormation if it already exists.
  // Enable Macie manually in the AWS Console if not already active.
  if (Config.env === "dev") {

    // Custom identifier for Finnish personal identity codes (henkilötunnus)
    new macie.CfnCustomDataIdentifier(stack, "FinnishPersonalIdIdentifier", {
      name: "FinnishPersonalIdentityCode",
      regex: "\\b\\d{6}[+\\-A]\\d{3}[0-9A-FHJ-NPR-Y]\\b",
      description: "Detects Finnish personal identity codes (henkilötunnus format: DDMMYY+/-A###X)",
    });

    // Macie findings repository bucket
    const macieFindingsBucket = new Bucket(stack, "MacieFindingsBucket", {
      bucketName: `${Config.env}-macie-findings-${stack.account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [{ id: "delete-old-findings", expiration: Duration.days(90) }],
    });

    macieFindingsBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal("macie.amazonaws.com")],
        actions: ["s3:PutObject"],
        resources: [macieFindingsBucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": stack.account,
          },
        },
      })
    );

    // Note: CfnFindingsPublicationConfiguration is not available in aws-cdk-lib v2.241.0.
    // Configure the findings repository manually:
    // AWS Console → Amazon Macie → Settings → Repository for sensitive data discovery results
    // → Configure now → Select bucket: dev-macie-findings-{account-id}
    new CfnOutput(stack, "MacieFindingsBucketName", {
      value: macieFindingsBucket.bucketName,
      description: "Bucket for Macie findings - configure in Macie console Settings",
    });
  }

  // Weekly scheduled classification job for sensitive data scanning
  const macieJobLambda = new lambda.Function(stack, "MacieClassificationJobLambda", {
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "macieSensitiveData.handler",
    code: lambda.Code.fromAsset("deployment/lib/lambda"),
    environment: {
      BUCKET_NAME: bucket.bucketName,
      ACCOUNT_ID: stack.account,
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

  // Alert on sensitive data findings
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
