import { ScheduledEvent, ScheduledEventType } from "./scheduledEvent";
import { getSQS } from "../aws/clients/getSQS";
import { config } from "../config";
import { log } from "../logger";
import { SendMessageRequest } from "@aws-sdk/client-sqs";

class EventSqsClient {
  async importAineisto(oid: string) {
    await this.sendScheduledEvent({ type: ScheduledEventType.IMPORT, oid });
  }

  async synchronizeAineisto(oid: string) {
    await this.sendScheduledEvent({ type: ScheduledEventType.SYNCHRONIZE, oid });
  }

  async sendScheduledEvent(params: ScheduledEvent, retry?: boolean) {
    const messageParams = this.createMessageParams(params, retry);
    if (messageParams) {
      log.info("sendScheduledEvent", { messageParams });
      const result = await getSQS().sendMessage(messageParams);
      log.info("sendScheduledEvent", { result });
    }
  }

  createMessageParams(params: ScheduledEvent, retry?: boolean) {
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
      QueueUrl: config.aineistoImportSqsUrl,
      DelaySeconds: retry ? 60 : undefined,
    };
    return messageParams;
  }
}

export const eventSqsClient = new EventSqsClient();
