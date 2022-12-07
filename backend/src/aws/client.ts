import SSM from "aws-sdk/clients/ssm";
import S3 from "aws-sdk/clients/s3";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { wrapXRayCaptureAWSClient } from "./monitoring";
import { produce } from "./produce";

export const getUSEast1ssm = (): SSM => produce<SSM>("ssm_us_east_1", () => new SSM({ region: "us-east-1" }));
export const getSSM = (): SSM => produce<SSM>("ssm", () => new SSM({ region: "eu-west-1" }));
export const getS3 = (): S3 => {
  if (process.env.S3_ENDPOINT) {
    return produce<S3>("s3", () => new S3({ endpoint: process.env.S3_ENDPOINT, s3ForcePathStyle: true }));
  } else {
    return produce<S3>("s3", () => new S3({ region: "eu-west-1" }));
  }
};

export const getDynamoDBDocumentClient = (): DynamoDB.DocumentClient => {
  return produce<DynamoDB.DocumentClient>("DynamoDB.DocumentClient", () => {
    const client = new DynamoDB.DocumentClient({ apiVersion: "2012-08-10", region: "eu-west-1" });
    wrapXRayCaptureAWSClient((client as any).service); // NOSONAR
    return client;
  });
};
