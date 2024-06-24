import { SQS, SendMessageRequest } from "@aws-sdk/client-sqs";
import { produce } from "../../aws/produce";
import { log } from "../../logger";
import { SqsEvent } from "./sqsEvent";
import { config } from "../../config";

export class SqsClient {
  static readonly getSQS = (): SQS => {
    return produce<SQS>("sqs-hyvaksymisesitys", () => new SQS({ region: "eu-west-1" }));
  };

  static async addEventToSqsQueue(params: SqsEvent, retry?: boolean) {
    const messageParams = createMessageParams(params, retry);
    if (messageParams) {
      log.info("addEventToHyvaksymisesitysSqsQueue", { messageParams });
      const result = await SqsClient.getSQS().sendMessage(messageParams);
      log.info("addEventToHyvaksymisesitysSqsQueue", { result });
    }
  }
}

function createMessageParams(params: SqsEvent, retry?: boolean) {
  if (retry) {
    let retriesLeft = params.retriesLeft;
    if (retriesLeft == undefined) {
      retriesLeft = 60;
    } else if (retriesLeft <= 0) {
      log.error("Giving up retrying", { params });
      return;
    } else {
      retriesLeft--;
    }
    params.retriesLeft = retriesLeft;
  }
  const messageParams: SendMessageRequest = {
    MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
    QueueUrl: config.hyvaksymisesitysSqsUrl,
    DelaySeconds: retry ? 60 : undefined,
  };
  return messageParams;
}
