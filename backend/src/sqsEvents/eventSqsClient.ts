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

  async synchronizeAineisto(oid: string, approvalType?: PublishOrExpireEventType, reason?: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.SYNCHRONIZE, oid, approvalType, reason });
  }

  async addEventToSqsQueue(params: SqsEvent) {
    const messageParams = this.createMessageParams(params);
    if (messageParams) {
      log.info("addEventToSqsQueue", { messageParams });
      const result = await getSQS().sendMessage(messageParams);
      log.info("addEventToSqsQueue", { result });
    }
  }

  createMessageParams(params: SqsEvent) {
    const messageParams: SendMessageRequest = {
      MessageGroupId: params.oid,
      MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
      QueueUrl: config.eventSqsUrl,
    };
    return messageParams;
  }
}

export const eventSqsClient = new EventSqsClient();
