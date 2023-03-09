import { ImportAineistoEvent } from "./importAineistoEvent";
import { getSQS } from "../aws/clients/getSQS";
import { config } from "../config";
import { log } from "../logger";
import SQS from "aws-sdk/clients/sqs";

class AineistoImporterClient {
  async importAineisto(params: ImportAineistoEvent, retry?: boolean) {
    const messageParams = this.createMessageParams(params, retry);
    if (messageParams) {
      log.info("importAineisto", { messageParams });
      const result = await getSQS().sendMessage(messageParams).promise();
      log.info("importAineisto", { result });
    }
  }

  createMessageParams(params: ImportAineistoEvent, retry?: boolean) {
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
    const messageParams: SQS.Types.SendMessageRequest = {
      MessageGroupId: params.oid,
      MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
      QueueUrl: config.aineistoImportSqsUrl,
      DelaySeconds: retry ? 60 : undefined,
    };
    return messageParams;
  }
}

export const aineistoImporterClient = new AineistoImporterClient();
