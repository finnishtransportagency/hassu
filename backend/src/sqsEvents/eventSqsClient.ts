import { SqsEvent, SqsEventType } from "./sqsEvent";
import { getSQS } from "../aws/clients/getSQS";
import { config } from "../config";
import { log } from "../logger";
import { SendMessageRequest } from "@aws-sdk/client-sqs";
import { PublishOrExpireEventType } from "./projektiScheduleManager";

class EventSqsClient {
  async zipNahtavillaoloAineisto(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_NAHTAVILLAOLO, oid });
  }

  async zipLausuntoPyyntoAineisto(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_LAUSUNTOPYYNNOT, oid });
  }

  async zipSingleLausuntoPyynto(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_LAUSUNTOPYYNTO, oid, uuid });
  }

  async zipLausuntoPyynnonTaydennysAineisto(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET, oid });
  }

  async handleChangedAineisto(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.AINEISTO_CHANGED, oid });
  }

  async handleChangedTiedostot(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.FILES_CHANGED, oid });
  }

  async handleChangedAineistotAndTiedostot(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.AINEISTO_AND_FILES_CHANGED, oid });
  }

  async synchronizeAineisto(oid: string, approvalType?: PublishOrExpireEventType) {
    await this.addEventToSqsQueue({ type: SqsEventType.SYNCHRONIZE, oid, approvalType });
  }

  async addEventToSqsQueue(params: SqsEvent, retry?: boolean) {
    const messageParams = this.createMessageParams(params, retry);
    if (messageParams) {
      log.info("addEventToSqsQueue", { messageParams });
      const result = await getSQS().sendMessage(messageParams);
      log.info("addEventToSqsQueue", { result });
    }
  }

  createMessageParams(params: SqsEvent, retry?: boolean) {
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
      QueueUrl: config.eventSqsUrl,
      DelaySeconds: retry ? 60 : undefined,
    };
    return messageParams;
  }
}

export const eventSqsClient = new EventSqsClient();
