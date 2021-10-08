import * as ddb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import { Config } from "./config";

export class HassuDatabaseStack extends cdk.Stack {
  public projektiTable: ddb.Table;

  constructor(scope: cdk.Construct) {
    super(scope, "database", {
      stackName: "hassu-database-" + Config.env,
      env: {
        region: "eu-west-1",
      },
    });
    const table = new ddb.Table(this, "ProjektiTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      tableName: Config.projektiTableName,
      partitionKey: {
        name: "oid",
        type: ddb.AttributeType.STRING,
      },
    });
    if (Config.isPermanentEnvironment()) {
      table.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }
    this.projektiTable = table;
  }
}
