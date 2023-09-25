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
import { ProjektiAineistoManager } from "../aineisto/projektiAineistoManager";
import { nahtavillaoloTilaManager } from "../handler/tila/nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "../handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { jatkoPaatos1VaiheTilaManager } from "../handler/tila/jatkoPaatos1VaiheTilaManager";
import { jatkoPaatos2VaiheTilaManager } from "../handler/tila/jatkoPaatos2VaiheTilaManager";

async function handleImport(ctx: ImportContext) {
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

        switch (scheduledEvent.type) {
          case ScheduledEventType.END_NAHTAVILLAOLO_AINEISTOMUOKKAUS:
            await nahtavillaoloTilaManager.rejectAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            await nahtavillaoloTilaManager.peruAineistoMuokkaus(projekti);
            break;
          case ScheduledEventType.END_HYVAKSYMISPAATOS_AINEISTOMUOKKAUS:
            await hyvaksymisPaatosVaiheTilaManager.rejectAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            await hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti);
            break;
          case ScheduledEventType.END_JATKOPAATOS1_AINEISTOMUOKKAUS:
            await jatkoPaatos1VaiheTilaManager.rejectAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            await jatkoPaatos1VaiheTilaManager.peruAineistoMuokkaus(projekti);
            break;
          case ScheduledEventType.END_JATKOPAATOS2_AINEISTOMUOKKAUS:
            await jatkoPaatos2VaiheTilaManager.rejectAineistoMuokkaus(projekti, "kuulutuspäivä koitti");
            await jatkoPaatos2VaiheTilaManager.peruAineistoMuokkaus(projekti);
            break;
          case ScheduledEventType.IMPORT:
            await handleImport(ctx);
            break;
          default:
            break;
        }

        await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);

        // Synkronoidaan tiedostot aina
        const successfulSynchronization = await synchronizeAll(ctx);

        if (scheduledEvent.type == ScheduledEventType.SYNCHRONIZE) {
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
