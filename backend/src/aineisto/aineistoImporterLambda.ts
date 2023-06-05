import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { DBProjekti } from "../database/model";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import { aineistoSynchronizerService } from "./aineistoSynchronizerService";
import { ProjektiAineistoManager } from "./projektiAineistoManager";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import * as API from "../../../common/graphql/apiModel";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { synchronizeFilesToPublic } from "./synchronizeFilesToPublic";
import { ProjektiPaths } from "../files/ProjektiPath";
import dayjs from "dayjs";
import { aineistoImporterClient } from "./aineistoImporterClient";

async function handleImport(projekti: DBProjekti) {
  const oid = projekti.oid;
  const manager = new ProjektiAineistoManager(projekti);
  const vuorovaikutusKierros = await manager.getVuorovaikutusKierros().handleChanges();
  const nahtavillaoloVaihe = await manager.getNahtavillaoloVaihe().handleChanges();
  const hyvaksymisPaatosVaihe = await manager.getHyvaksymisPaatosVaihe().handleChanges();
  const jatkoPaatos1Vaihe = await manager.getJatkoPaatos1Vaihe().handleChanges();
  const jatkoPaatos2Vaihe = await manager.getJatkoPaatos2Vaihe().handleChanges();
  // Päivitä vain jos on muuttuneita tietoja
  if (vuorovaikutusKierros || nahtavillaoloVaihe || hyvaksymisPaatosVaihe || jatkoPaatos1Vaihe || jatkoPaatos2Vaihe) {
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      versio: projekti.versio,
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
      await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(projekti, changes);
    }
  }
}

async function synchronizeEULogot(projekti: DBProjekti) {
  // Projekti status should at least be published (aloituskuulutus) until the logo is published to public
  const julkinenStatus = (await projektiAdapterJulkinen.adaptProjekti(projekti))?.status;
  if (
    projekti.euRahoitusLogot &&
    julkinenStatus &&
    julkinenStatus !== API.Status.EI_JULKAISTU &&
    julkinenStatus !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT
  ) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).euLogot(), dayjs("2000-01-01"));
  }
}

async function synchronizeKuntaLogo(projekti: DBProjekti, status: API.Status) {
  const logoFilePath = projekti.suunnitteluSopimus?.logo;
  if (logoFilePath && status && status !== API.Status.EI_JULKAISTU && status !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).suunnittelusopimus(), dayjs("2000-01-01"));
  }
}

async function synchronizeAll(aineistoEvent: ImportAineistoEvent, projekti: DBProjekti): Promise<boolean> {
  const oid = projekti.oid;
  const projektiStatus = (await projektiAdapter.adaptProjekti(projekti)).status;
  if (!projektiStatus) {
    throw new Error("Projektin statusta ei voitu määrittää: " + oid);
  }
  await synchronizeEULogot(projekti);
  await synchronizeKuntaLogo(projekti, projektiStatus);

  const manager = new ProjektiAineistoManager(projekti);
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
        const aineistoEvent: ImportAineistoEvent = JSON.parse(record.body);
        if (aineistoEvent.scheduleName) {
          await aineistoSynchronizerService.deletePastSchedule(aineistoEvent.scheduleName);
        }
        log.info("ImportAineistoEvent", aineistoEvent);
        const { oid } = aineistoEvent;

        const projekti = await projektiDatabase.loadProjektiByOid(oid);
        if (!projekti) {
          throw new Error("Projektia " + oid + " ei löydy");
        }

        if (aineistoEvent.type == ImportAineistoEventType.IMPORT) {
          await handleImport(projekti);
        }
        // Synkronoidaan tiedostot aina
        const successfulSynchronization = await synchronizeAll(aineistoEvent, projekti);

        if (aineistoEvent.type == ImportAineistoEventType.SYNCHRONIZE) {
          await projektiSearchService.indexProjekti(projekti);
        }
        if (!successfulSynchronization) {
          // Yritä uudelleen minuutin päästä
          await aineistoImporterClient.importAineisto(aineistoEvent, true);
        }
      }
    } catch (e: unknown) {
      log.error(e);
      throw e;
    }
  });
};
