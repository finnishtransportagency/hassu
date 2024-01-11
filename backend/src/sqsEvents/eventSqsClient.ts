import { SqsEvent, SqsEventType } from "./sqsEvent";
import { getSQS } from "../aws/clients/getSQS";
import { config } from "../config";
import { log } from "../logger";
import { SendMessageRequest } from "@aws-sdk/client-sqs";

class EventSqsClient {
  async handleAineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.AINEISTO_CHANGED, oid });
  }

  async handleTiedostotChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.TIEDOSTOT_CHANGED, oid });
  }

  async zipNahtavillaoloAineisto(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_NAHTAVILLAOLO, oid });
  }

  async zipLausuntoPyynto(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_LAUSUNTOPYYNNOT, oid, uuid });
  }

  async zipLausuntoPyynnonTaydennysAineisto(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYS, oid, uuid });
  }

  async handleVuorovaikutusAineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.VUOROVAIKUTUS_AINEISTO_CHANGED, oid });
  }

  async handleNahtavillaoloAineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.NAHTAVILLAOLO_AINEISTO_NAHTAVILLA_CHANGED, oid });
  }

  async handleLausuntoPyynnotLisaAineistoChanged(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.LISA_AINEISTO_CHANGED, oid, uuid });
  }

  async handleLausuntoPyynnonTaydennysMuuAineistoChanged(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.MUU_AINEISTO_CHANGED, oid, uuid });
  }

  async handleLausuntoPyynnonTaydennysMuistutuksetChanged(oid: string, uuid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.MUISTUTUKSET_CHANGED, oid, uuid });
  }

  async handleHyvaksymisvaiheAineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.HYVAKSYMISVAIHE_AINEISTO_NAHTAVILLA_CHANGED, oid });
  }

  async handleHyvaksymisvaiheHyvaksymispaatosChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.HYVAKSYMISVAIHE_HYVAKSYMISPAATOS_CHANGED, oid });
  }

  async handleJatkopaatos1AineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.JATKOPAATOS1_AINEISTO_NAHTAVILLA_CHANGED, oid });
  }

  async handleJatkopaatos1HyvaksymispaatosChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.JATKOPAATOS1_HYVAKSYMISPAATOS_CHANGED, oid });
  }

  async handleJatkopaatos2AineistoChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.JATKOPAATOS2_AINEISTO_NAHTAVILLA_CHANGED, oid });
  }

  async handleJatkopaatos2HyvaksymispaatosChanged(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.JATKOPAATOS2_HYVAKSYMISPAATOS_CHANGED, oid });
  }

  async handleVuorovaikutusKierrosJulkaisuAineistoChanged(oid: string, id: number) {
    await this.addEventToSqsQueue({ type: SqsEventType.VUOROVAIKUTUS_JULKAISU_AINEISTO_CHANGED, oid, id });
  }

  async synchronizeAineistoAndIndexProjekti(oid: string) {
    await this.addEventToSqsQueue({ type: SqsEventType.SYNCHRONIZE_AND_INDEX, oid });
  }

  async addEventToSqsQueue(params: SqsEvent, retry?: boolean) {
    const messageParams = this.createMessageParams(params, retry);
    if (messageParams) {
      await getSQS().sendMessage(messageParams);
      log.info("added event to sqsl queue", params);
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
