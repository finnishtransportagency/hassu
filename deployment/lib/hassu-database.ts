import * as ddb from "@aws-cdk/aws-dynamodb";
import { Config } from "./config";
import { RemovalPolicy } from "@aws-cdk/core";
import { Construct } from "constructs";
import { config } from "../../backend/src/config";

export function createDatabase(scope: Construct) {
  const table = new ddb.Table(scope, "ProjektiTable", {
    billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    tableName: config.projektiTableName,
    partitionKey: {
      name: "oid",
      type: ddb.AttributeType.STRING,
    },
  });
  if (Config.isPermanentEnvironment()) {
    table.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
  return table;
}
