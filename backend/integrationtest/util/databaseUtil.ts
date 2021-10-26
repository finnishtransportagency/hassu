import * as log from "loglevel";

import * as sinon from "sinon";
import { SinonStub } from "sinon";
import * as dynamoDB from "../../src/database/dynamoDB";

import DynamoDB from "aws-sdk/clients/dynamodb";
import { HookFunction } from "mocha";

const localDynamoDBParams = {
  endpoint: "http://localhost:4566",
  accessKeyId: "anyKey",
  secretAccessKey: "anySecret",
  region: "eu-west-1",
};
const localDynamoDB = new DynamoDB(localDynamoDBParams);
const localDocumentClient = new DynamoDB.DocumentClient({
  service: localDynamoDB,
  apiVersion: "2012-08-10",
  params: localDynamoDBParams,
});

// Try to use the database configuration from deployment in
let localDynamoDBDocumentClientStub: SinonStub;

function replaceAWSDynamoDBWithLocalstack() {
  localDynamoDBDocumentClientStub = sinon.stub(dynamoDB, "getDynamoDBDocumentClient");
  localDynamoDBDocumentClientStub.returns(localDocumentClient);
}

export async function setupLocalDatabase() {
  try {
    await deleteAllItemsFromDatabase();
  } catch (e) {
    // Ignore
  }
  replaceAWSDynamoDBWithLocalstack();
}

async function deleteAllItemsFromDatabase() {
  // Hard-code table name to prevent accidental deletion from AWS
  log.info("Cleaning up database");
  const items = (await localDocumentClient.scan({ TableName: "Projekti-localstack" }).promise()).Items;
  if (items) {
    await Promise.all(
      items.map(async (item) => {
        log.info("Deleting ", item);
        await localDocumentClient.delete({ TableName: "Projekti-localstack", Key: { oid: item.oid } }).promise();
      })
    );
  }
}

afterEach("Reset database stub", (() => {
  return localDynamoDBDocumentClientStub.restore();
}) as HookFunction);
