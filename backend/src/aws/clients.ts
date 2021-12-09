import { SSMClient } from "@aws-sdk/client-ssm";
import { produceAWSClient } from "./clientProducer";
import { S3Client } from "@aws-sdk/client-s3";

export const getUSEast1ssmClient = () => produceAWSClient("ssm_east_1", () => new SSMClient({ region: "us-east-1" }));
export const getS3Client = () => produceAWSClient("s3", () => new S3Client({}));
