import { SQS, SendMessageRequest } from "@aws-sdk/client-sqs";
import { produce } from "../../aws/produce";
import { log } from "../../logger";
import { SqsEvent } from "./sqsEvent";

export const getSQS = (): SQS => {
  return produce<SQS>("sqs-hyvaksymisesitys", () => new SQS({ region: "eu-west-1" }));
};

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
    MessageGroupId: params.oid,
    MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
    QueueUrl: "", //TODO: config.hyvaksymisEsitysSqsUrl,
    DelaySeconds: retry ? 60 : undefined,
  };
  return messageParams;
}

export async function addEventToSqsQueue(params: SqsEvent, retry?: boolean) {
  const messageParams = createMessageParams(params, retry);
  if (messageParams) {
    log.info("addEventToSqsQueue", { messageParams });
    const result = await getSQS().sendMessage(messageParams);
    log.info("addEventToSqsQueue", { result });
  }
}
