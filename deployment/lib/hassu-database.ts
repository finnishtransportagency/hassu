import * as ddb from "aws-cdk-lib/aws-dynamodb";
import { ProjectionType, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { CfnOutput, Duration, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";
import { IOriginAccessIdentity, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import * as backup from "aws-cdk-lib/aws-backup";
import * as events from "aws-cdk-lib/aws-events";
import { ArnPrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct } from "constructs";
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
  public uploadBucket!: Bucket;
  public yllapitoBucket!: Bucket;
  public internalBucket!: Bucket;
  public publicBucket!: Bucket;
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
    createResourceGroup(this); // Ympäristön valitsemiseen esim. CloudWatchissa
  }

  private createProjektiTables() {
    const pointInTimeRecovery = Config.getEnvConfig().pointInTimeRecovery;
    const projektiTable = new ddb.Table(this, "ProjektiTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
      pointInTimeRecovery,
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
      pointInTimeRecovery,
    });
    HassuDatabaseStack.enableBackup(lyhytOsoiteTable);

    if (Config.isPermanentEnvironment()) {
      lyhytOsoiteTable.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    return { projektiTable, lyhytOsoiteTable };
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
      pointInTimeRecovery: Config.getEnvConfig().pointInTimeRecovery,
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
      pointInTimeRecovery: Config.getEnvConfig().pointInTimeRecovery,
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
      pointInTimeRecovery: Config.getEnvConfig().pointInTimeRecovery,
      timeToLiveAttribute: "expires",
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
    }
  }
}
