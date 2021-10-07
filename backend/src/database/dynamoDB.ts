import { DynamoDB } from "aws-sdk";

/* This function is separated into an individual module so that it can be replaced in integration and unit tests */
let client;

function getDynamoDBDocumentClient() {
  if (!client) {
    client = new DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
  }
  return client;
}

export { getDynamoDBDocumentClient };
