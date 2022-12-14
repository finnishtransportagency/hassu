import SQS from "aws-sdk/clients/sqs";
import { produce } from "../produce";

export const getSQS = (): SQS => {
  return produce<SQS>("sqs", () => new SQS({ region: "eu-west-1" }));
};
