import SSM from "aws-sdk/clients/ssm";
import SQS from "aws-sdk/clients/sqs";
import S3 from "aws-sdk/clients/s3";
import Cloudfront from "aws-sdk/clients/cloudfront";
import * as AWSXRay from "aws-xray-sdk-core";

function produce<T>(name: string, p: () => T, override = false): T {
  const key = "produce_" + name;
  if (!(globalThis as any)[key] || override) {
    const client = p();
    try {
      (globalThis as any)[key] = AWSXRay.captureAWSClient(client);
    } catch (ignore) {
      (globalThis as any)[key] = client;
    }
  }
  return (globalThis as any)[key];
}

export const getUSEast1ssm = (): SSM => produce<SSM>("ssm_us_east_1", () => new SSM({ region: "us-east-1" }));
export const getSSM = (): SSM => produce<SSM>("ssm", () => new SSM({ region: "eu-west-1" }));
export const getS3 = (): S3 => {
  if (process.env.S3_ENDPOINT) {
    return produce<S3>("s3", () => new S3({ endpoint: process.env.S3_ENDPOINT, s3ForcePathStyle: true }));
  } else {
    return produce<S3>("s3", () => new S3({ region: "eu-west-1" }));
  }
};
export const getSQS = (): SQS => {
  return produce<SQS>("sqs", () => new SQS({ region: "eu-west-1" }));
};

export const getCloudFront = (): Cloudfront => produce<Cloudfront>("cloudfront", () => new Cloudfront({ region: "us-east-1" }));
