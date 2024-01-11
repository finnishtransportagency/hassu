import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { SqsEvent, SqsEventType } from "./sqsEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSchedulerService } from "./projektiSchedulerService";
import { eventSqsClient } from "./eventSqsClient";
import { nahtavillaoloTilaManager } from "../handler/tila/nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "../handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { jatkoPaatos1VaiheTilaManager } from "../handler/tila/jatkoPaatos1VaiheTilaManager";
import { jatkoPaatos2VaiheTilaManager } from "../handler/tila/jatkoPaatos2VaiheTilaManager";
import { AineistoMuokkausError, SimultaneousUpdateError } from "hassu-common/error";
import { assertIsDefined } from "../util/assertions";
import {
  handleHyvaksymisVaiheAineistoChanged,
  handleHyvaksymisVaiheHyvaksymisPaatosChanged,
  handleJatkopaatos1AineistoChanged,
  handleJatkopaatos1HyvaksymispaatosChanged,
  handleJatkopaatos2AineistoChanged,
  handleJatkopaatos2HyvaksymispaatosChanged,
  handleLausuntoPyynnonTaydennysZipping,
  handleLausuntoPyyntoZipping,
  handleLisaAineistotChanged,
  handleMuitutuksetChanged,
  handleMuuAineistoChanged,
  handleNahtavillaoloAineistoChanged,
  handleNahtavillaoloZipping,
  handleSynchronizeAndIndex,
  handleVuorovaikutusKierrosAineistoChanged,
  handleVuorovaikutusKierrosJulkaisuAineistoChanged,
  triggerAineistoTiedostoEventsBasedOnNeeds,
} from "./sqsEventHandlers";

export const handlerFactory = (event: SQSEvent) => async () => {
  try {
    for (const record of event.Records) {
      const sqsEvent: SqsEvent = JSON.parse(record.body);
      if (sqsEvent.scheduleName) {
        await projektiSchedulerService.deletePastSchedule(sqsEvent.scheduleName);
      }
      log.info("sqsEvent", sqsEvent);
      const { oid, uuid, id } = sqsEvent;
      const projekti = await projektiDatabase.loadProjektiByOid(oid);
      if (!projekti) {
        throw new Error("Projektia " + oid + " ei löydy");
      }
      try {
        switch (sqsEvent.type) {
          case SqsEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS:
            await nahtavillaoloTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            break;
          case SqsEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS:
            await hyvaksymisPaatosVaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            break;
          case SqsEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS:
            await jatkoPaatos1VaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            break;
          case SqsEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS:
            await jatkoPaatos2VaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            break;
          case SqsEventType.VUOROVAIKUTUS_AINEISTO_CHANGED:
            await handleVuorovaikutusKierrosAineistoChanged(projekti);
            break;
          case SqsEventType.VUOROVAIKUTUS_JULKAISU_AINEISTO_CHANGED:
            assertIsDefined(id, "eventillä VUOROVAIKUTUS_AINEISTO_CHANGED tulee olla id tieto");
            await handleVuorovaikutusKierrosJulkaisuAineistoChanged(projekti, id);
            break;
          case SqsEventType.NAHTAVILLAOLO_AINEISTO_NAHTAVILLA_CHANGED:
            await handleNahtavillaoloAineistoChanged(projekti);
            await eventSqsClient.zipNahtavillaoloAineisto(oid);
            if (projekti.lausuntoPyynnot) {
              await Promise.all(projekti.lausuntoPyynnot.map((lp) => eventSqsClient.zipLausuntoPyynto(oid, lp.uuid)));
            }
            break;
          case SqsEventType.LISA_AINEISTO_CHANGED:
            assertIsDefined(uuid, "eventillä LISA_AINEISTO_CHANGED tulee olla uuid tieto");
            await handleLisaAineistotChanged(projekti, uuid);
            await eventSqsClient.zipLausuntoPyynto(oid, uuid);
            break;
          case SqsEventType.MUU_AINEISTO_CHANGED:
            assertIsDefined(uuid, "eventillä MUU_AINEISTO_CHANGED tulee olla uuid tieto");
            await handleMuuAineistoChanged(projekti, uuid);
            await eventSqsClient.zipLausuntoPyynnonTaydennysAineisto(oid, uuid);
            break;
          case SqsEventType.MUISTUTUKSET_CHANGED:
            assertIsDefined(uuid, "eventillä MUISTUTUKSET_CHANGED tulee olla uuid tieto");
            await handleMuitutuksetChanged(projekti, uuid);
            await eventSqsClient.zipLausuntoPyynnonTaydennysAineisto(oid, uuid);
            break;
          case SqsEventType.HYVAKSYMISVAIHE_AINEISTO_NAHTAVILLA_CHANGED:
            await handleHyvaksymisVaiheAineistoChanged(projekti);
            break;
          case SqsEventType.HYVAKSYMISVAIHE_HYVAKSYMISPAATOS_CHANGED:
            await handleHyvaksymisVaiheHyvaksymisPaatosChanged(projekti);
            break;
          case SqsEventType.JATKOPAATOS1_AINEISTO_NAHTAVILLA_CHANGED:
            await handleJatkopaatos1AineistoChanged(projekti);
            break;
          case SqsEventType.JATKOPAATOS1_HYVAKSYMISPAATOS_CHANGED:
            await handleJatkopaatos1HyvaksymispaatosChanged(projekti);
            break;
          case SqsEventType.JATKOPAATOS2_AINEISTO_NAHTAVILLA_CHANGED:
            await handleJatkopaatos2AineistoChanged(projekti);
            break;
          case SqsEventType.JATKOPAATOS2_HYVAKSYMISPAATOS_CHANGED:
            await handleJatkopaatos2HyvaksymispaatosChanged(projekti);
            break;
          case SqsEventType.ZIP_NAHTAVILLAOLO:
            await handleNahtavillaoloZipping(projekti);
            break;
          case SqsEventType.ZIP_LAUSUNTOPYYNTO:
            assertIsDefined(uuid, "ZIP_LAUSUNTOPYYNTO event should have uuid information");
            await handleLausuntoPyyntoZipping(projekti, uuid);
            break;
          case SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYS:
            assertIsDefined(uuid, "ZIP_LAUSUNTOPYYNNON_TAYDENNYS event should have uuid information");
            await handleLausuntoPyynnonTaydennysZipping(projekti, uuid);
            break;
          case SqsEventType.SYNCHRONIZE_AND_INDEX:
            if (!(await handleSynchronizeAndIndex(projekti))) {
              // Yritä uudelleen minuutin päästä
              await eventSqsClient.addEventToSqsQueue(sqsEvent, true);
            }
            break;
          case SqsEventType.AINEISTO_CHANGED:
            await triggerAineistoTiedostoEventsBasedOnNeeds(projekti);
            break;
          case SqsEventType.TIEDOSTOT_CHANGED:
            await triggerAineistoTiedostoEventsBasedOnNeeds(projekti);
            break;
          default:
            break;
        }
      } catch (e) {
        if (e instanceof AineistoMuokkausError) {
          log.info("Scheduled event cancelled. All ok.", e.message);
        } else if (e instanceof SimultaneousUpdateError) {
          // Yritä uudestaan ilman viivettä
          await eventSqsClient.addEventToSqsQueue(sqsEvent);
          // Lopeta suoritus; ei synkronointia ja indeksöintiä
          return;
        } else {
          throw e;
        }
      }
      if (![SqsEventType.SYNCHRONIZE_AND_INDEX, SqsEventType.AINEISTO_CHANGED, SqsEventType.TIEDOSTOT_CHANGED].includes(sqsEvent.type)) {
        await eventSqsClient.synchronizeAineistoAndIndexProjekti(oid);
      }
    }
  } catch (e: unknown) {
    log.error(e);
    throw e;
  }
};

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", handlerFactory(event));
};
