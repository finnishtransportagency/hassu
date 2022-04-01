import AWS from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk-core";

export function produce<T>(name: string, p: () => T, override = false): T {
  const key = "produce_" + name;
  if (!(globalThis as any)[key] || override || process.env.MOCHA_WORKER_ID) {
    (globalThis as any)[key] = AWSXRay.captureAWSClient(p() as any);
  }
  return (globalThis as any)[key];
}

export const getUSEast1ssm = (): AWS.SSM =>
  produce<AWS.SSM>("ssm_us_east_1", () => new AWS.SSM({ region: "us-east-1" }));
export const getSSM = (): AWS.SSM => produce<AWS.SSM>("ssm", () => new AWS.SSM({ region: "eu-west-1" }));
export const getS3 = (): AWS.S3 => {
  if (process.env.S3_ENDPOINT) {
    return new AWS.S3({ endpoint: process.env.S3_ENDPOINT, s3ForcePathStyle: true });
  } else {
    return produce<AWS.S3>("s3", () => new AWS.S3({ region: "eu-west-1" }));
  }
};
export const getSQS = (): AWS.SQS => {
  return produce<AWS.SQS>("sqs", () => new AWS.SQS({ region: "eu-west-1" }));
};
