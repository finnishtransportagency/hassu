import { ImportAineistoEvent } from "./importAineistoEvent";
import { getSQS } from "../aws/client";
import { config } from "../config";
import { log } from "../logger";
import SQS from "aws-sdk/clients/sqs";

class AineistoImporterClient {
  async importAineisto(params: ImportAineistoEvent) {
    const messageParams: SQS.Types.SendMessageRequest = {
      MessageGroupId: params.oid,
      MessageBody: JSON.stringify({ timestamp: Date.now(), ...params }),
      QueueUrl: config.aineistoImportSqsUrl,
    };
    log.info({ messageParams });
    const result = await getSQS().sendMessage(messageParams).promise();
    log.info({ result });
  }
}

export const aineistoImporterClient = new AineistoImporterClient();
