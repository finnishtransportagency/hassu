import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { ScheduledEvent, ScheduledEventType } from "./scheduledEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSchedulerService } from "./projektiSchedulerService";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import * as API from "hassu-common/graphql/apiModel";
import { synchronizeFilesToPublic } from "../aineisto/synchronizeFilesToPublic";
import { ProjektiPaths } from "../files/ProjektiPath";
import dayjs from "dayjs";
import { eventSqsClient } from "./eventSqsClient";
import { ImportContext } from "../aineisto/importContext";
import { aineistoDeleterService } from "../aineisto/aineistoDeleterService";
import { ProjektiAineistoManager } from "../aineisto/ProjektiAineistoManager";
import { nahtavillaoloTilaManager } from "../handler/tila/nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "../handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { jatkoPaatos1VaiheTilaManager } from "../handler/tila/jatkoPaatos1VaiheTilaManager";
import { jatkoPaatos2VaiheTilaManager } from "../handler/tila/jatkoPaatos2VaiheTilaManager";
import { AineistoMuokkausError } from "hassu-common/error";

async function handleZipping(ctx: ImportContext) {
  //TODO: joskus muillekin vaiheille kuin nahtavillaolo
  if (!ctx.projekti.nahtavillaoloVaihe) return;
  const oid = ctx.oid;
  const manager: ProjektiAineistoManager = ctx.manager;
  const nahtavillaoloVaiheAineisto = manager.getNahtavillaoloVaihe();
  const aineistopakettiFullS3Key =
    new ProjektiPaths(oid).nahtavillaoloVaihe(ctx.projekti.nahtavillaoloVaihe).yllapitoFullPath + "/aineisto.zip";
  log.info("luodaan aineistopaiketti, key: " + aineistopakettiFullS3Key);
  await nahtavillaoloVaiheAineisto.createZipOfAineisto(aineistopakettiFullS3Key);

  const aineistopakettiRelativeS3Key =
    new ProjektiPaths(oid).nahtavillaoloVaihe(ctx.projekti.nahtavillaoloVaihe).yllapitoPath + "/aineisto.zip";
  const nahtavillaoloVaihe = { ...ctx.projekti.nahtavillaoloVaihe };
  log.info("paivitetaan dbprojekti aineistopaketti-tiedolla: " + aineistopakettiRelativeS3Key);
  await projektiDatabase.saveProjektiWithoutLocking({
    oid,
    versio: ctx.projekti.versio,
    nahtavillaoloVaihe: { ...nahtavillaoloVaihe, aineistopaketti: "/" + aineistopakettiRelativeS3Key },
  });
}

async function handleChangedAineisto(ctx: ImportContext) {
  const oid = ctx.oid;
  const manager: ProjektiAineistoManager = ctx.manager;
  const vuorovaikutusKierros = await manager.getVuorovaikutusKierros().handleChanges();
  const nahtavillaoloVaihe = await manager.getNahtavillaoloVaihe().handleChanges();
  const hyvaksymisPaatosVaihe = await manager.getHyvaksymisPaatosVaihe().handleChanges();
  const jatkoPaatos1Vaihe = await manager.getJatkoPaatos1Vaihe().handleChanges();
  const jatkoPaatos2Vaihe = await manager.getJatkoPaatos2Vaihe().handleChanges();
  // Päivitä vain jos on muuttuneita tietoja
  if (vuorovaikutusKierros || nahtavillaoloVaihe || hyvaksymisPaatosVaihe || jatkoPaatos1Vaihe || jatkoPaatos2Vaihe) {
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      versio: ctx.projekti.versio,
      vuorovaikutusKierros,
      nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    });
  }

  for (const julkaisuAineisto of manager.getVuorovaikutusKierrosJulkaisut()) {
    const changes = await julkaisuAineisto.handleChanges();
    if (changes) {
      log.info("Päivitetään vuorovaikutusKierrosJulkaisu aineistojen tuonnin jälkeen", { vuorovaikutusKierrosJulkaisu: changes });
      await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(ctx.projekti, changes);
    }
  }

  if (nahtavillaoloVaihe) {
    return await eventSqsClient.zipAineisto(oid);
  }
}

async function synchronizeEULogot(ctx: ImportContext) {
  // Projekti status should at least be published (aloituskuulutus) until the logo is published to public
  const julkinenStatus = ctx.julkinenStatus;
  const projekti = ctx.projekti;
  if (
    projekti.euRahoitusLogot &&
    julkinenStatus &&
    julkinenStatus !== API.Status.EI_JULKAISTU &&
    julkinenStatus !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT
  ) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).euLogot(), dayjs("2000-01-01"));
  }
}

async function synchronizeKuntaLogo(ctx: ImportContext) {
  const logoFilePath = ctx.projekti.suunnitteluSopimus?.logo;
  const status = ctx.projektiStatus;
  const projekti = ctx.projekti;
  if (logoFilePath && status && status !== API.Status.EI_JULKAISTU && status !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).suunnittelusopimus(), dayjs("2000-01-01"));
  }
}

async function synchronizeAll(ctx: ImportContext): Promise<boolean> {
  await synchronizeEULogot(ctx);
  await synchronizeKuntaLogo(ctx);

  const manager: ProjektiAineistoManager = ctx.manager;
  return (
    (await manager.getAloitusKuulutusVaihe().synchronize()) &&
    (await manager.getVuorovaikutusKierros().synchronize()) &&
    (await manager.getNahtavillaoloVaihe().synchronize()) &&
    (await manager.getHyvaksymisPaatosVaihe().synchronize()) &&
    (await manager.getJatkoPaatos1Vaihe().synchronize()) &&
    (await manager.getJatkoPaatos2Vaihe().synchronize())
  );
}

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", async () => {
    try {
      for (const record of event.Records) {
        const scheduledEvent: ScheduledEvent = JSON.parse(record.body);
        if (scheduledEvent.scheduleName) {
          await projektiSchedulerService.deletePastSchedule(scheduledEvent.scheduleName);
        }
        log.info("ScheduledEvent", scheduledEvent);
        const { oid } = scheduledEvent;
        const projekti = await projektiDatabase.loadProjektiByOid(oid);
        if (!projekti) {
          throw new Error("Projektia " + oid + " ei löydy");
        }

        const ctx = await new ImportContext(projekti).init();
        try {
          switch (scheduledEvent.type) {
            case ScheduledEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS:
              await nahtavillaoloTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
              break;
            case ScheduledEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS:
              await hyvaksymisPaatosVaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
              break;
            case ScheduledEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS:
              await jatkoPaatos1VaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
              break;
            case ScheduledEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS:
              await jatkoPaatos2VaiheTilaManager.rejectAndPeruAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
              break;
            // deprecated, kept until next production deployment
            // Tämä on täällä vielä siltä varalta, että tuotantoon viemisen hetkellä sqs-jonossa on IMPORT-eventtejä
            case ScheduledEventType.IMPORT:
              await handleChangedAineisto(ctx);
              break;
            case ScheduledEventType.AINEISTO_CHANGED:
              await handleChangedAineisto(ctx);
              break;
            case ScheduledEventType.ZIP:
              await handleZipping(ctx);
              break;
            default:
              break;
          }
        } catch (e) {
          if (e instanceof AineistoMuokkausError) {
            log.info("Scheduled event cancelled. All ok.", e.message);
          } else {
            throw e;
          }
        }

        await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);

        // Synkronoidaan tiedostot aina
        const successfulSynchronization = await synchronizeAll(ctx);

        if (projekti && scheduledEvent.type == ScheduledEventType.SYNCHRONIZE) {
          await projektiSearchService.indexProjekti(projekti);
        }
        if (!successfulSynchronization) {
          // Yritä uudelleen minuutin päästä
          await eventSqsClient.sendScheduledEvent(scheduledEvent, true);
        }
      }
    } catch (e: unknown) {
      log.error(e);
      throw e;
    }
  });
};
