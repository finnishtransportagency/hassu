import * as ddb from "@aws-cdk/aws-dynamodb";
import { StreamViewType } from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
import { Duration, RemovalPolicy } from "@aws-cdk/core";
import { Config } from "./config";
import { BlockPublicAccess, Bucket, HttpMethods } from "@aws-cdk/aws-s3";
import { OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";

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

    this.uploadBucket = this.createUploadBucket();
    this.yllapitoBucket = this.createYllapitoBucket();
    this.internalBucket = this.createInternalBucket();
    this.archiveBucket = this.createArchiveBucket();
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
    return new Bucket(this, "ArchiveBucket", {
      bucketName: Config.archiveBucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: false,
    });
  }

  private createYllapitoBucket() {
    const bucket = new Bucket(this, "YllapitoBucket", {
      bucketName: Config.yllapitoBucketName,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    if (Config.env !== "localstack") {
      const oaiName = "CloudfrontOriginAccessIdentity" + Config.env;
      const oai = new OriginAccessIdentity(this, oaiName, { comment: oaiName });

      // tslint:disable-next-line:no-unused-expression
      new cdk.CfnOutput(this, "CloudFrontOriginAccessIdentity", {
        value: oai.originAccessIdentityName || "",
      });

      bucket.grantRead(oai);
    }
    return bucket;
  }
}
