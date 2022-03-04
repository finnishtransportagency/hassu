import { SSMClient } from "@aws-sdk/client-ssm";
import { produceAWSClient } from "./clientProducer";
import { S3Client } from "@aws-sdk/client-s3";
import { LambdaClient } from "@aws-sdk/client-lambda";

export const getUSEast1ssmClient = ():SSMClient =>
  produceAWSClient<SSMClient>("ssm_us_east_1", () => new SSMClient({ region: "us-east-1" }));
export const getSSMClient = ():SSMClient => produceAWSClient<SSMClient>("ssm", () => new SSMClient({ region: "eu-west-1" }));
export const getS3Client = ():S3Client => produceAWSClient<S3Client>("s3", () => new S3Client({ region: "eu-west-1" }));
export const getLambdaClient = ():LambdaClient =>
  produceAWSClient<LambdaClient>("lambda", () => new LambdaClient({ region: "eu-west-1" }));
