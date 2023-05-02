import { SQS } from "@aws-sdk/client-sqs";
import { produce } from "../produce";

export const getSQS = (): SQS => {
  return produce<SQS>("sqs", () => new SQS({ region: "eu-west-1" }));
};
