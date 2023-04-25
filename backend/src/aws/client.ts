import { SSM } from "@aws-sdk/client-ssm";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { wrapXRayCaptureAWSClient } from "./monitoring";
import { produce } from "./produce";

export const getUSEast1ssm = (): SSM => produce<SSM>("ssm_us_east_1", () => new SSM({ region: "us-east-1" }));
export const getSSM = (): SSM => produce<SSM>("ssm", () => new SSM({ region: "eu-west-1" }));

export const getS3Client = (): S3Client => {
  if (process.env.S3_ENDPOINT) {
    return produce<S3Client>("S3Client", () => {
      return new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        credentials: { accessKeyId: "test", secretAccessKey: "test" },
      });
    });
  } else {
    return produce<S3Client>("S3Client", () => new S3Client({ region: "eu-west-1" }));
  }
};

export const getDynamoDBDocumentClient = (): DynamoDBDocumentClient => {
  return produce<DynamoDBDocumentClient>("DynamoDB.DocumentClient", () => {
    const dynamoDB = new DynamoDB({ region: "eu-west-1" });
    const client = DynamoDBDocumentClient.from(dynamoDB, { marshallOptions: { removeUndefinedValues: true } });
    wrapXRayCaptureAWSClient(dynamoDB);
    return client;
  });
};
