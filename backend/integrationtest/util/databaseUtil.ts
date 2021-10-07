import { createDatabase } from "../../../deployment/lib/hassu-database";
import * as cdk from "@aws-cdk/core";
import { Stack } from "@aws-cdk/core";
import * as log from "loglevel";

import * as sinon from "sinon";
import { SinonStub } from "sinon";
import * as dynamoDB from "../../src/database/dynamoDB";

import { DynamoDB } from "aws-sdk";
import { config } from "../../src/config";

const localDynamoDBParams = {
  endpoint: "http://localhost:4566",
  accessKeyId: "anyKey",
  secretAccessKey: "anySecret",
  region: "eu-west-1",
};
const localDynamoDB = new DynamoDB(localDynamoDBParams);

const tableFromDeployment = createDatabase(new Stack(new cdk.App()));
let localDynamoDBDocumentClientStub: SinonStub;

async function setupLocalDatabase() {
  try {
    log.info("Cleaning up local database");
    await cleanupLocalDatabase();
  } catch (e) {
    // Ignore
  }

  localDynamoDBDocumentClientStub = sinon.stub(dynamoDB, "getDynamoDBDocumentClient");
  localDynamoDBDocumentClientStub.returns(
    new DynamoDB.DocumentClient({ service: localDynamoDB, apiVersion: "2012-08-10", params: localDynamoDBParams })
  );

  try {
    await localDynamoDB
      .createTable({
        TableName: config.projektiTableName,
        KeySchema: [{ KeyType: "HASH", AttributeName: tableFromDeployment.schema().partitionKey.name }],
        AttributeDefinitions: [
          {
            AttributeName: tableFromDeployment.schema().partitionKey.name,
            AttributeType: tableFromDeployment.schema().partitionKey.type,
          },
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 1000, WriteCapacityUnits: 1000 },
      })
      .promise();
  } catch (e) {
    log.error(e);
    throw e;
  }
}

async function cleanupLocalDatabase() {
  await localDynamoDB
    .deleteTable({
      TableName: config.projektiTableName,
    })
    .promise();
  localDynamoDBDocumentClientStub.restore();
}

export { setupLocalDatabase, cleanupLocalDatabase };
