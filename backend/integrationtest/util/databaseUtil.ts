import * as sinon from "sinon";
import { SinonStub } from "sinon";

import DynamoDB from "aws-sdk/clients/dynamodb";
import * as awsClient from "../../src/aws/client";
import mocha from "mocha";

const localDynamoDBParams = {
  endpoint: "http://localhost:4566",
  accessKeyId: "anyKey",
  secretAccessKey: "anySecret",
  region: "eu-west-1",
};
const localDynamoDB = new DynamoDB(localDynamoDBParams);
export const localDocumentClient = new DynamoDB.DocumentClient({
  service: localDynamoDB,
  apiVersion: "2012-08-10",
  params: localDynamoDBParams,
});

// Try to use the database configuration from deployment in
let localDynamoDBDocumentClientStub: SinonStub;

export function setupLocalDatabase(): void {
  mocha.before(() => {
    localDynamoDBDocumentClientStub = sinon.stub(awsClient, "getDynamoDBDocumentClient");
    localDynamoDBDocumentClientStub.returns(localDocumentClient);
  });
  mocha.beforeEach(() => {
    localDynamoDBDocumentClientStub.returns(localDocumentClient);
  });
}
