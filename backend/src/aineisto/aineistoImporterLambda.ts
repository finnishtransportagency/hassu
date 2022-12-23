import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { DBProjekti } from "../database/model";
import { projektiAdapter } from "../projekti/adapter/projektiAdapter";
import { aineistoSynchronizerService } from "./aineistoSynchronizerService";
import { ProjektiAineistoManager } from "./projektiAineistoManager";

async function handleImport(projekti: DBProjekti) {
  const oid = projekti.oid;
  const manager = new ProjektiAineistoManager(projekti);
  await projektiDatabase.saveProjekti({
    oid,
    versio: projekti.versio,
    vuorovaikutusKierros: await manager.getVuorovaikutusKierros().handleChanges(),
    nahtavillaoloVaihe: await manager.getNahtavillaoloVaihe().handleChanges(),
    hyvaksymisPaatosVaihe: await manager.getHyvaksymisPaatosVaihe().handleChanges(),
    jatkoPaatos1Vaihe: await manager.getJatkoPaatos1Vaihe().handleChanges(),
    jatkoPaatos2Vaihe: await manager.getJatkoPaatos2Vaihe().handleChanges(),
  });
}

async function synchronizeAll(aineistoEvent: ImportAineistoEvent, projekti: DBProjekti) {
  const oid = projekti.oid;
  const projektiStatus = projektiAdapter.adaptProjekti(projekti).status;
  if (!projektiStatus) {
    throw new Error("Projektin statusta ei voitu määrittää: " + oid);
  }

  const manager = new ProjektiAineistoManager(projekti);
  await manager.getAloitusKuulutusVaihe().synchronize();
  await manager.getVuorovaikutusKierros().synchronize();
  await manager.getNahtavillaoloVaihe().synchronize();
  await manager.getHyvaksymisPaatosVaihe().synchronize();
  await manager.getJatkoPaatos1Vaihe().synchronize();
  await manager.getJatkoPaatos2Vaihe().synchronize();
}

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", async () => {
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
      await synchronizeAll(aineistoEvent, projekti);
    }
  });
};
