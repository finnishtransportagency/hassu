import * as DynamoDB from "aws-sdk/clients/dynamodb";
import * as AWSXRay from "aws-xray-sdk-core";

/* This function is separated into an individual module so that it can be replaced in integration and unit tests */
let client: DynamoDB.DocumentClient;

function getDynamoDBDocumentClient(): DynamoDB.DocumentClient {
  if (!client) {
    client = new DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AWSXRay.captureAWSClient((client as any).service); // NOSONAR
  }
  return client;
}

export { getDynamoDBDocumentClient };
