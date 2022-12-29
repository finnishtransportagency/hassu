import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { ProjectionType, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { CfnOutput, Duration, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { IOriginAccessIdentity, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import * as backup from "aws-cdk-lib/aws-backup";
import * as events from "aws-cdk-lib/aws-events";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct } from "constructs";

// These should correspond to CfnOutputs produced by this stack
export type DatabaseStackOutputs = {
  CloudFrontOriginAccessIdentity: string;
};

export const databaseStackName = "hassu-database-" + Config.env;

export class HassuDatabaseStack extends Stack {
  public projektiTable!: ddb.Table;
  public projektiArchiveTable!: ddb.Table;
  public feedbackTable!: ddb.Table;
  public uploadBucket!: Bucket;
  public yllapitoBucket!: Bucket;
  public internalBucket!: Bucket;
  public archiveBucket!: Bucket;
  public publicBucket!: Bucket;
  private config!: Config;

  constructor(scope: Construct) {
    super(scope, "database", {
      stackName: databaseStackName,
      terminationProtection: Config.getEnvConfig().terminationProtection,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
  }

  async process(): Promise<void> {
    this.config = await Config.instance(this);
    this.projektiTable = this.createProjektiTable();
    this.projektiArchiveTable = this.createProjektiArchiveTable();
    this.feedbackTable = this.createFeedbackTable();

    let oai;
    if (Config.env !== "localstack") {
      const oaiName = "CloudfrontOriginAccessIdentity" + Config.env;
      oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new CfnOutput(this, "CloudFrontOriginAccessIdentity", {
        value: oai.originAccessIdentityId || "",
      });
    }

    this.uploadBucket = this.createUploadBucket();
    this.yllapitoBucket = this.createYllapitoBucket(oai);
    this.internalBucket = this.createInternalBucket();
    this.archiveBucket = this.createArchiveBucket();
    this.publicBucket = this.createPublicBucket(oai);
    this.createBackupPlan();
  }

  private createProjektiTable() {
    const table = new ddb.Table(this, "ProjektiTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
    });
    HassuDatabaseStack.enableBackup(table);
    table.addGlobalSecondaryIndex({
      indexName: "UusiaPalautteitaIndex",
      sortKey: { name: "uusiaPalautteita", type: ddb.AttributeType.NUMBER },
      partitionKey: { name: "oid", type: ddb.AttributeType.STRING },
      projectionType: ProjectionType.KEYS_ONLY,
    });

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
      allowedOrigins = ["https://" + this.config.frontendDomainName];
    }
    return new Bucket(this, "UploadBucket", {
      bucketName: Config.uploadBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ id: this.stackName + "-upload-delete-after-24h", expiration: Duration.hours(24) }],
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins,
          allowedHeaders: ["*"],
        },
      ],
    });
  }

  private createInternalBucket() {
    return new Bucket(this, "InternalBucket", {
      bucketName: Config.internalBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createArchiveBucket() {
    const bucket = new Bucket(this, "ArchiveBucket", {
      bucketName: Config.archiveBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
    });

    // These exports added here so that the references from backend stack can be removed first. This code and archive bucket can be deleted after this code has been deployed once to every environment
    this.exportValue(bucket.bucketArn);
    this.exportValue(bucket.bucketName);

    // Do not keep archived data in developer environments
    bucket.addLifecycleRule({ id: this.stackName + "-upload-delete-after-48h", expiration: Duration.hours(24) });

    return bucket;
  }

  private createYllapitoBucket(originAccessIdentity?: IOriginAccessIdentity) {
    const bucket = new Bucket(this, "YllapitoBucket", {
      bucketName: Config.yllapitoBucketName,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    if (originAccessIdentity) {
      bucket.grantRead(originAccessIdentity);
    }
    HassuDatabaseStack.enableBackup(bucket);
    return bucket;
  }

  private static enableBackup(scope: IConstruct) {
    if (Config.isPermanentEnvironment()) {
      Tags.of(scope).add("hassu-backup", "true");
    }
  }

  private createPublicBucket(originAccessIdentity?: IOriginAccessIdentity) {
    const bucket = new Bucket(this, "PublicBucket", {
      bucketName: Config.publicBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });
    if (originAccessIdentity) {
      bucket.grantRead(originAccessIdentity);
    }
    HassuDatabaseStack.enableBackup(bucket);
    return bucket;
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

      // Enable continuous backups via addOverride because our current CDK version doesn't support it
      const cfnPlan = plan.node.defaultChild as backup.CfnBackupPlan;
      cfnPlan.addOverride("Properties.BackupPlan.BackupPlanRule.0.EnableContinuousBackup", true);

      const backupSelection = plan.addSelection("HassuBackupTag", {
        allowRestores: true,
        resources: [backup.BackupResource.fromTag("hassu-backup", "true")],
      });
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "S3BucketBackupPermissions",
          actions: [
            "s3:GetInventoryConfiguration",
            "s3:PutInventoryConfiguration",
            "s3:ListBucketVersions",
            "s3:ListBucket",
            "s3:GetBucketVersioning",
            "s3:GetBucketNotification",
            "s3:PutBucketNotification",
            "s3:GetBucketLocation",
            "s3:GetBucketTagging",
          ],
          effect: Effect.ALLOW,
          resources: ["arn:aws:s3:::*"],
        })
      );
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "S3ObjectBackupPermissions",
          actions: [
            "s3:GetObjectAcl",
            "s3:GetObject",
            "s3:GetObjectVersionTagging",
            "s3:GetObjectVersionAcl",
            "s3:GetObjectTagging",
            "s3:GetObjectVersion",
          ],
          effect: Effect.ALLOW,
          resources: ["arn:aws:s3:::*/*"],
        })
      );
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "S3GlobalPermissions",
          actions: ["s3:ListAllMyBuckets"],
          effect: Effect.ALLOW,
          resources: ["*"],
        })
      );
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "KMSBackupPermissions",
          actions: ["kms:Decrypt", "kms:DescribeKey"],
          effect: Effect.ALLOW,
          resources: ["*"],
          conditions: {
            StringLike: {
              "kms:ViaService": "s3.*.amazonaws.com",
            },
          },
        })
      );
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "EventsPermissions",
          actions: [
            "events:DescribeRule",
            "events:EnableRule",
            "events:PutRule",
            "events:DeleteRule",
            "events:PutTargets",
            "events:RemoveTargets",
            "events:ListTargetsByRule",
            "events:DisableRule",
          ],
          effect: Effect.ALLOW,
          resources: ["arn:aws:events:*:*:rule/AwsBackupManagedRule*"],
        })
      );
      backupSelection.grantPrincipal.addToPrincipalPolicy(
        new PolicyStatement({
          sid: "EventsMetricsGlobalPermissions",
          actions: ["cloudwatch:GetMetricData", "events:ListRules"],
          effect: Effect.ALLOW,
          resources: ["*"],
        })
      );
    }
  }
}
