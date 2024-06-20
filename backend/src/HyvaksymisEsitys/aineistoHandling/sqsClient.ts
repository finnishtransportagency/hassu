import { SQS, SendMessageRequest } from "@aws-sdk/client-sqs";
import { produce } from "../../aws/produce";
import { log } from "../../logger";
import { SqsEvent } from "./sqsEvent";
import { config } from "../../config";

export class SqsClient {
  static readonly getSQS = (): SQS => {
    return produce<SQS>("sqs-hyvaksymisesitys", () => new SQS({ region: "eu-west-1" }));
  };

  static async addEventToSqsQueue(params: SqsEvent) {
    const messageParams = createMessageParams(params);
    if (messageParams) {
      log.info("addEventToHyvaksymisesitysSqsQueue", { messageParams });
      const result = await SqsClient.getSQS().sendMessage(messageParams);
      log.info("addEventToHyvaksymisesitysSqsQueue", { result });
    }
  }
}

function createMessageParams(params: SqsEvent) {
  const messageParams: SendMessageRequest = {
    MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
    QueueUrl: config.hyvaksymisesitysSqsUrl,
  };
  return messageParams;
}
