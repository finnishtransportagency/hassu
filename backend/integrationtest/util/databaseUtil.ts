import * as sinon from "sinon";
import { SinonStub } from "sinon";

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as awsClient from "../../src/aws/client";
import mocha from "mocha";

const localDynamoDB = new DynamoDB({
  endpoint: "http://localhost:4566",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  region: "eu-west-1",
});
export const localDocumentClient = DynamoDBDocumentClient.from(localDynamoDB, { marshallOptions: { removeUndefinedValues: true } });

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
