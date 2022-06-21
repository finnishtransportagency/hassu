import * as ddb from "@aws-cdk/aws-dynamodb";
import { ProjectionType, StreamViewType } from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
import { Duration, RemovalPolicy, Tags } from "@aws-cdk/core";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, HttpMethods } from "@aws-cdk/aws-s3";
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { IOriginAccessIdentity } from "@aws-cdk/aws-cloudfront/lib/origin-access-identity";
import * as backup from "@aws-cdk/aws-backup";
import * as events from "@aws-cdk/aws-events";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { IConstruct } from "@aws-cdk/core/lib/construct-compat";
import { BackupPlanRuleProps } from "@aws-cdk/aws-backup/lib/rule";

// These should correspond to CfnOutputs produced by this stack
export type DatabaseStackOutputs = {
  CloudFrontOriginAccessIdentity: string;
};

export class HassuDatabaseStack extends cdk.Stack {
  public projektiTable!: ddb.Table;
  public projektiArchiveTable!: ddb.Table;
  public uploadBucket!: Bucket;
  public yllapitoBucket!: Bucket;
  public internalBucket!: Bucket;
  public archiveBucket!: Bucket;
  public publicBucket!: Bucket;
  private config!: Config;

  constructor(scope: cdk.Construct) {
    super(scope, "database", {
      stackName: "hassu-database-" + Config.env,
      env: {
        region: "eu-west-1",
      },
      tags: Config.tags,
    });
  }

  async process() {
    this.config = await Config.instance(this);
    this.projektiTable = this.createProjektiTable();
    this.projektiArchiveTable = this.createProjektiArchiveTable();

    let oai;
    if (Config.env !== "localstack") {
      const oaiName = "CloudfrontOriginAccessIdentity" + Config.env;
      oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new cdk.CfnOutput(this, "CloudFrontOriginAccessIdentity", {
        value: oai.originAccessIdentityName || "",
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

    // TODO: uncomment after cdk-construct+aws-cdk version upgrade
    // const cfnTable = table.node.defaultChild as CfnTable;
    // cfnTable.tableClass = "STANDARD_INFREQUENT_ACCESS";

    if (Config.isPermanentEnvironment()) {
      HassuDatabaseStack.enableBackup(table);
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return table;
  }

  private createUploadBucket() {
    return new Bucket(this, "UploadBucket", {
      bucketName: Config.uploadBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ id: this.stackName + "-upload-delete-after-24h", expiration: Duration.hours(24) }],
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["http://localhost:3000", "https://" + this.config.frontendDomainName],
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
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });
    if (Config.isPermanentEnvironment()) {
      HassuDatabaseStack.enableBackup(bucket);
    } else {
      // Do not keep archived data in developer environments
      bucket.addLifecycleRule({ id: this.stackName + "-upload-delete-after-48h", expiration: Duration.hours(48) });
    }

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

      let backupPlanRuleProps: BackupPlanRuleProps;
      if (Config.isProductionEnvironment()) {
        backupPlanRuleProps = {
          moveToColdStorageAfter: Duration.days(35),
          deleteAfter: Duration.days(365),
        };
      } else {
        backupPlanRuleProps = {
          deleteAfter: Duration.days(35),
        };
      }

      const plan = new backup.BackupPlan(this, backupPlanName, {
        backupPlanName,
        backupVault: new backup.BackupVault(this, backupVaultName, { backupVaultName }),
        backupPlanRules: [
          new backup.BackupPlanRule({
            ...backupPlanRuleProps,
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
