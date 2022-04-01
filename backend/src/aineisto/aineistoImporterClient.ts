import { ImportAineistoEvent } from "./importAineistoEvent";
import { getSQS } from "../aws/client";
import { config } from "../config";

class AineistoImporterClient {
  async importAineisto(params: ImportAineistoEvent) {
    getSQS().sendMessage({ MessageBody: JSON.stringify(params), QueueUrl: config.aineistoImportSqsUrl });
  }
}

export const aineistoImporterClient = new AineistoImporterClient();
