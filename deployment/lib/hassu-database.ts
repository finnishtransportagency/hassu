// Contains code generated or recommended by Amazon Q
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { PointInTimeRecoverySpecification, ProjectionType, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { CfnOutput, Duration, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { IOriginAccessIdentity, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import * as backup from "aws-cdk-lib/aws-backup";
import * as events from "aws-cdk-lib/aws-events";
import { ArnPrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct } from "constructs";
import { SSMParameterName } from "./config";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CfnMalwareProtectionPlan } from "aws-cdk-lib/aws-guardduty";
import { CfnSession } from "aws-cdk-lib/aws-macie";
import { createResourceGroup } from "./common";

// These should correspond to CfnOutputs produced by this stack
export type DatabaseStackOutputs = {
  CloudFrontOriginAccessIdentity: string;
};

export const databaseStackName = "hassu-database-" + Config.env;

export class HassuDatabaseStack extends Stack {
  public projektiTable!: ddb.Table;
  public lyhytOsoiteTable!: ddb.Table;
  public projektiArchiveTable!: ddb.Table;
  public feedbackTable!: ddb.Table;
  public kiinteistonOmistajaTable!: ddb.Table;
  public projektiMuistuttajaTable!: ddb.Table;
  public tiedoteTable!: ddb.Table;
  public schemaMetaTable!: ddb.Table;
  public nahtavillaoloVaiheJulkaisuTable!: ddb.Table;
  public projektiDataTable!: ddb.Table;
  public uploadBucket!: Bucket;
  public yllapitoBucket!: Bucket;
  public internalBucket!: Bucket;
  public publicBucket!: Bucket;
  public quarantineBucket!: Bucket;
  private config!: Config;

  constructor(scope: Construct, awsAccountId: string) {
    super(scope, "database", {
      stackName: databaseStackName,
      terminationProtection: Config.getEnvConfig().terminationProtection,
      env: {
        account: awsAccountId,
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
  }

  async process(): Promise<void> {
    this.config = await Config.instance(this);
    const { projektiTable, lyhytOsoiteTable } = this.createProjektiTables();
    this.projektiTable = projektiTable;
    this.lyhytOsoiteTable = lyhytOsoiteTable;
    this.projektiArchiveTable = this.createProjektiArchiveTable();
    this.feedbackTable = this.createFeedbackTable();
    this.kiinteistonOmistajaTable = this.createKiinteistonomistajaTable();
    this.projektiMuistuttajaTable = this.createProjektiMuistuttajaTable();
    this.tiedoteTable = this.createTiedoteTable();
    this.nahtavillaoloVaiheJulkaisuTable = this.createNahtavillaoloVaiheJulkaisuTable();
    this.projektiDataTable = this.createProjektiDataTable();
    this.schemaMetaTable = this.createSchemaMetaTable();
    let oai;
    if (Config.isNotLocalStack()) {
      const oaiName = "CloudfrontOriginAccessIdentity" + Config.env;
      oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new CfnOutput(this, "CloudFrontOriginAccessIdentity", {
        value: oai.originAccessIdentityId || "",
      });
    }

    this.uploadBucket = this.createUploadBucket();
    this.yllapitoBucket = await this.createYllapitoBucket(oai);
    this.internalBucket = this.createInternalBucket();
    this.publicBucket = this.createPublicBucket(oai);
    this.createBackupPlan();
    if (Config.env === "dev" || Config.isDeveloperEnvironment()) {
      this.quarantineBucket = this.createQuarantineBucket();
      const alertEmail = await this.config.getParameterNow("SecurityAlertEmail");
      const alertTopic = new sns.Topic(this, "SecurityAlertTopic", {
        displayName: "Security Alerts",
      });
      alertTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
      await this.createMalwareProtectionForS3(this.yllapitoBucket, this.quarantineBucket, alertTopic);
      this.createMacieSensitiveDataScanning(this.yllapitoBucket, alertTopic);
    }
    createResourceGroup(this); // Ympäristön valitsemiseen esim. CloudWatchissa
  }

  private createProjektiTables() {
    const pointInTimeRecoverySpecification: PointInTimeRecoverySpecification = {
      pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery,
    };
    const projektiTable = new ddb.Table(this, "ProjektiTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification,
    });
    HassuDatabaseStack.enableBackup(projektiTable);
    projektiTable.addGlobalSecondaryIndex({
      indexName: "UusiaPalautteitaIndex",
      sortKey: { name: "uusiaPalautteita", type: ddb.AttributeType.NUMBER },
      partitionKey: { name: "oid", type: ddb.AttributeType.STRING },
      projectionType: ProjectionType.KEYS_ONLY,
    });

    if (Config.isPermanentEnvironment()) {
      projektiTable.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }

    const lyhytOsoiteTable = new ddb.Table(this, "LyhytOsoiteTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.lyhytOsoiteTableName,
      partitionKey: {
        name: "lyhytOsoite",
        type: ddb.AttributeType.STRING,
      },
      pointInTimeRecoverySpecification,
    });
    HassuDatabaseStack.enableBackup(lyhytOsoiteTable);

    if (Config.isPermanentEnvironment()) {
      lyhytOsoiteTable.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return { projektiTable, lyhytOsoiteTable };
  }

  public createSchemaMetaTable() {
    const table = new ddb.Table(this, "SchemaMetaTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.schemaMetaTableName,
      partitionKey: {
        name: "tableName",
        type: ddb.AttributeType.STRING,
      },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery,
      },
    });

    HassuDatabaseStack.enableBackup(table);

    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }

    return table;
  }
  private createFeedbackTable() {
    const table = new ddb.Table(this, "FeedbackTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.feedbackTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
    });
    HassuDatabaseStack.enableBackup(table);

    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createKiinteistonomistajaTable() {
    const table = new ddb.Table(this, "KiinteistonomistajaTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.kiinteistonomistajaTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
      timeToLiveAttribute: "expires",
    });
    HassuDatabaseStack.enableBackup(table);

    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createProjektiMuistuttajaTable() {
    const table = new ddb.Table(this, "Projektimuistuttaja", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiMuistuttajaTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
      timeToLiveAttribute: "expires",
    });
    HassuDatabaseStack.enableBackup(table);

    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createTiedoteTable() {
    const table = new ddb.Table(this, "TiedoteTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.tiedoteTableName,
      partitionKey: {
        name: "id",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
      timeToLiveAttribute: "expires",
    });
    HassuDatabaseStack.enableBackup(table);

    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createNahtavillaoloVaiheJulkaisuTable(): ddb.Table {
    const table = new ddb.Table(this, "NahtavillaoloVaiheJulkaisuTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.nahtavillaoloVaiheJulkaisuTableName,
      partitionKey: {
        name: "projektiOid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: ddb.AttributeType.NUMBER,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
      timeToLiveAttribute: "expires",
    });
    HassuDatabaseStack.enableBackup(table);
    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createProjektiDataTable(): ddb.Table {
    const table = new ddb.Table(this, "ProjektiData", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiDataTableName,
      partitionKey: {
        name: "projektiOid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "sortKey",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !!Config.getEnvConfig().pointInTimeRecovery },
    });
    HassuDatabaseStack.enableBackup(table);
    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createProjektiArchiveTable() {
    const table = new ddb.Table(this, "ProjektiArchiveTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiArchiveTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: ddb.AttributeType.STRING,
      },
    });

    table.applyRemovalPolicy(RemovalPolicy.DESTROY);
    return table;
  }

  private createUploadBucket() {
    let allowedOrigins: string[];
    if (Config.isDeveloperEnvironment()) {
      allowedOrigins = ["http://localhost:3000", "https://" + this.config.frontendDomainName];
    } else {
      allowedOrigins = this.config.getDomainNames().map((name) => "https://" + name);
    }
    return new Bucket(this, "UploadBucket", {
      bucketName: Config.uploadBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ id: this.stackName + "-upload-delete-after-24h", expiration: Duration.hours(24) }],
      removalPolicy: RemovalPolicy.DESTROY,
      enforceSSL: true,
      cors: [
        {
          id: "upload-bucket-cors-rule",
          allowedMethods: [HttpMethods.PUT, HttpMethods.POST],
          allowedOrigins,
          allowedHeaders: ["*"],
          maxAge: 60,
          exposedHeaders: [],
        },
      ],
    });
  }

  private createInternalBucket() {
    return new Bucket(this, "InternalBucket", {
      bucketName: Config.internalBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
  }

  private async createYllapitoBucket(originAccessIdentity?: IOriginAccessIdentity) {
    const bucket = new Bucket(this, "YllapitoBucket", {
      bucketName: Config.yllapitoBucketName,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    if (originAccessIdentity) {
      bucket.grantRead(originAccessIdentity);
    }
    HassuDatabaseStack.enableBackup(bucket);

    // Virusskannaus
    const virusScannerLambdaRole = await this.config.getParameterNow("VirusScannerLambdaRole");
    bucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "AllowVirusScanLambdaFunctionAccess",
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(virusScannerLambdaRole)],
        actions: ["s3:GetObject", "s3:PutObjectTagging"],
        resources: [bucket.bucketArn + "/*/palautteet/*"],
      })
    );

    return bucket;
  }

  private static enableBackup(scope: IConstruct) {
    if (Config.isPermanentEnvironment()) {
      Tags.of(scope).add("hassu-backup", Config.env);
    }
  }

  private createPublicBucket(originAccessIdentity?: IOriginAccessIdentity) {
    const bucket = new Bucket(this, "PublicBucket", {
      bucketName: Config.publicBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
    if (originAccessIdentity) {
      bucket.grantRead(originAccessIdentity);
    }
    HassuDatabaseStack.enableBackup(bucket);
    return bucket;
  }

  private createQuarantineBucket(): Bucket {
    return new Bucket(this, "QuarantineBucket", {
      bucketName: Config.quarantineBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ id: this.stackName + "-quarantine-delete-after-90d", expiration: Duration.days(90) }],
    });
  }

  private async createMalwareProtectionForS3(bucket: Bucket, quarantineBucket: Bucket, alertTopic: sns.Topic) {
    const scanRole = new Role(this, "GuardDutyMalwareScanRole", {
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

    const malwareProtectionPlan = new CfnMalwareProtectionPlan(this, "S3MalwareProtection", {
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

    const quarantineLambda = new lambda.Function(this, "MalwareQuarantineLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("tools/malwareQuarantine"),
      environment: {
        SOURCE_BUCKET: bucket.bucketName,
        QUARANTINE_BUCKET: quarantineBucket.bucketName,
      },
      timeout: Duration.seconds(30),
    });
    bucket.grantReadWrite(quarantineLambda);
    bucket.grantDelete(quarantineLambda);
    quarantineBucket.grantWrite(quarantineLambda);

    new events.Rule(this, "GuardDutyMalwareScanRule", {
      eventPattern: {
        source: ["aws.guardduty"],
        detailType: ["GuardDuty Malware Protection Object Scan Result"],
        detail: {
          scanResultDetails: {
            scanResult: ["THREATS_FOUND"],
          },
        },
      },
      targets: [new targets.LambdaFunction(quarantineLambda), new targets.SnsTopic(alertTopic)],
    });
  }

  private createMacieSensitiveDataScanning(bucket: Bucket, alertTopic: sns.Topic) {
    // Macie Session is an account-level resource — only create it once (in dev environment)
    if (Config.env === "dev") {
      new CfnSession(this, "MacieSession", {
        status: "ENABLED",
        findingPublishingFrequency: "FIFTEEN_MINUTES",
      });
    }

    // Weekly scheduled classification job for sensitive data scanning
    const macieJobLambda = new lambda.Function(this, "MacieClassificationJobLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("tools/macieSensitiveData"),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        ACCOUNT_ID: this.account,
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

    new events.Rule(this, "MacieWeeklyScanRule", {
      description: "Triggers Macie sensitive data scan weekly on Mondays",
      schedule: events.Schedule.cron({ minute: "0", hour: "3", weekDay: "MON" }),
      targets: [new targets.LambdaFunction(macieJobLambda)],
    });

    // Alert on findings
    new events.Rule(this, "MacieFindingsRule", {
      eventPattern: {
        source: ["aws.macie"],
        detailType: ["Macie Finding"],
      },
      targets: [new targets.SnsTopic(alertTopic)],
    });
  }

  private createBackupPlan() {
    if (Config.isPermanentEnvironment()) {
      const backupPlanName = "Plan-" + Config.env;
      const backupVaultName = "Vault-" + Config.env;

      const plan = new backup.BackupPlan(this, backupPlanName, {
        backupPlanName,
        backupVault: new backup.BackupVault(this, backupVaultName, { backupVaultName }),
        backupPlanRules: [
          new backup.BackupPlanRule({
            enableContinuousBackup: true,
            deleteAfter: Duration.days(35),
            ruleName: "Daily",
            startWindow: Duration.hours(1),
            completionWindow: Duration.hours(2),
            scheduleExpression: events.Schedule.cron({
              minute: "0",
              hour: "5",
              day: "*",
              month: "*",
              year: "*",
            }),
          }),
        ],
      });

      const backupPlanRole = new Role(this, "BackupRole-" + Config.env, {
        assumedBy: new ServicePrincipal("backup.amazonaws.com"),
      });
      backupPlanRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSBackupServiceRolePolicyForS3Restore"));
      backupPlanRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSBackupServiceRolePolicyForS3Backup"));

      plan.addSelection("HassuBackup", {
        allowRestores: true,
        resources: [backup.BackupResource.fromTag("hassu-backup", Config.env)],
        role: backupPlanRole,
      });

      if (Config.env === "dev" || Config.env === "prod") {
        this.createRestoreTestingPlan(backupVaultName, backupPlanRole);
      }
    }
  }

  /**
   * Creates an automated restore testing plan for compliance purposes.
   *
   * The plan verifies that backups are actually restorable by performing automated
   * restore tests semi-annually (June 1st and December 1st at 02:00 Finnish time).
   *
   * What it does:
   * 1. Selects a random recovery point from the last 34 days (1 day margin to
   *    35-day retention to avoid selecting an expiring recovery point)
   * 2. Restores DynamoDB tables and S3 buckets tagged with "hassu-backup" into new temporary resources
   * 3. Validates that the restore operation completed successfully
   * 4. Automatically cleans up the restored resources
   *
   * Recovery point types tested:
   * - DynamoDB: SNAPSHOT (daily scheduled backups in vault). DynamoDB PITR is a
   *   DynamoDB-native feature independent of AWS Backup — if snapshot restore succeeds,
   *   PITR will also work as it uses DynamoDB's own transaction log. PITR availability
   *   is ensured by CDK (pointInTimeRecoveryEnabled) and visible in DynamoDB console.
   *   Manual PITR restore if needed: DynamoDB console → Tables → <Table> → Backups → Restore to point in time.
   * - S3: CONTINUOUS (point-in-time recovery via vault)
   *
   * Resources tested:
   * All DynamoDB tables and S3 buckets where HassuDatabaseStack.enableBackup(resource)
   * has been called. This adds the tag "hassu-backup"=<env>, which both the backup plan
   * and restore testing plan use to select resources.
   *
   * Results are visible in AWS Backup console under "Restore testing".
   *
   * Note: AWS Backup Restore Testing doesn't support manual triggering via CLI or console.
   * To test immediately, temporarily modify the scheduleExpression to a near-future time,
   * deploy the change, wait for execution, then revert the schedule back.
   *
   * Only runs in dev and prod environments.
   */
  private createRestoreTestingPlan(backupVaultName: string, restoreRole: Role) {
    const restoreTestingPlanName = `RestoreTest_${Config.env}`;
    const restoreTestingPlan = new backup.CfnRestoreTestingPlan(this, "RestoreTestingPlan", {
      restoreTestingPlanName,
      scheduleExpression: "cron(0 2 1 6,12 ? *)",
      scheduleExpressionTimezone: "Europe/Helsinki",
      startWindowHours: 24,
      recoveryPointSelection: {
        algorithm: "RANDOM_WITHIN_WINDOW",
        includeVaults: [`arn:aws:backup:eu-west-1:${this.account}:backup-vault:${backupVaultName}`],
        recoveryPointTypes: ["CONTINUOUS", "SNAPSHOT"],
        selectionWindowDays: 34,
      },
    });

    new backup.CfnRestoreTestingSelection(this, "RestoreTestingSelectionDynamoDB", {
      iamRoleArn: restoreRole.roleArn,
      protectedResourceType: "DynamoDB",
      restoreTestingPlanName: restoreTestingPlan.restoreTestingPlanName,
      restoreTestingSelectionName: `DynamoDB_${Config.env}`,
      protectedResourceConditions: {
        stringEquals: [{ key: "aws:ResourceTag/hassu-backup", value: Config.env }],
      },
    });

    new backup.CfnRestoreTestingSelection(this, "RestoreTestingSelectionS3", {
      iamRoleArn: restoreRole.roleArn,
      protectedResourceType: "S3",
      restoreTestingPlanName: restoreTestingPlan.restoreTestingPlanName,
      restoreTestingSelectionName: `S3_${Config.env}`,
      protectedResourceConditions: {
        stringEquals: [{ key: "aws:ResourceTag/hassu-backup", value: Config.env }],
      },
    });

    const alarmTopicArn = StringParameter.valueForStringParameter(this, SSMParameterName.HassuAlarmsSNSArn);
    const alarmTopic = sns.Topic.fromTopicArn(this, "BackupAlarmTopic", alarmTopicArn);

    // EventBridge permission to publish to SNS topic is granted in hassu-account stack
    // where the topic is created (configureSNSForAlarms method).
    new events.Rule(this, "RestoreTestResultRule", {
      description: "Notify on restore testing job completion or failure",
      eventPattern: {
        source: ["aws.backup"],
        detailType: ["Restore Job State Change"],
        detail: {
          status: ["COMPLETED", "FAILED"],
        },
      },
      targets: [
        new targets.SnsTopic(alarmTopic, {
          message: events.RuleTargetInput.fromText(
            [
              `[${Config.env}] AWS Backup Restore Testing: ${events.EventField.fromPath("$.detail.status")}`,
              "",
              "Automated restore test for Hassu application backups (compliance).",
              "Runs semi-annually (June 1st and December 1st) to verify that DynamoDB snapshot backups",
              "and S3 PITR backups are restorable.",
              "",
              `Environment: ${Config.env}`,
              `Resource type: ${events.EventField.fromPath("$.detail.resourceType")}`,
              `Status: ${events.EventField.fromPath("$.detail.status")}`,
              `Restore job ID: ${events.EventField.fromPath("$.detail.restoreJobId")}`,
              `Created resource: ${events.EventField.fromPath("$.detail.createdResourceArn")}`,
              "",
              "Results: AWS Backup console → Restore testing",
              "Configuration: deployment/lib/hassu-database.ts → createRestoreTestingPlan()",
            ].join("\n")
          ),
        }),
      ],
    });
  }
}
