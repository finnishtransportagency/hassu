import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { SqsEvent, SqsEventType } from "./sqsEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSchedulerService } from "./projektiSchedulerService";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import * as API from "hassu-common/graphql/apiModel";
import { synchronizeFilesToPublic } from "../tiedostot/synchronizeFilesToPublic";
import { ProjektiPaths } from "../files/ProjektiPath";
import dayjs from "dayjs";
import { eventSqsClient } from "./eventSqsClient";
import { ImportContext } from "../tiedostot/importContext";
import { aineistoDeleterService } from "../tiedostot/aineistoDeleterService";
import { ProjektiTiedostoManager } from "../tiedostot/ProjektiTiedostoManager";
import { nahtavillaoloTilaManager } from "../handler/tila/nahtavillaoloTilaManager";
import { hyvaksymisPaatosVaiheTilaManager } from "../handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { jatkoPaatos1VaiheTilaManager } from "../handler/tila/jatkoPaatos1VaiheTilaManager";
import { jatkoPaatos2VaiheTilaManager } from "../handler/tila/jatkoPaatos2VaiheTilaManager";
import { AineistoMuokkausError } from "hassu-common/error";
import { DBProjekti, LausuntoPyynnonTaydennys } from "../database/model";
import { LausuntoPyynnonTaydennyksetTiedostoManager } from "../tiedostot/ProjektiTiedostoManager/LausuntoPyynnonTaydennysTiedostoManager";
import { assertIsDefined } from "../util/assertions";
import { HYVAKSYMISPAATOS_VAIHE_PAATTYY, PublishOrExpireEventType } from "./projektiScheduleManager";
import { lahetaSuomiFiViestit } from "../suomifi/suomifiHandler";
import { emailClient } from "../email/email";
import { createKuukausiEpaaktiiviseenEmail } from "../email/emailTemplates";
import {
  findLatestHyvaksyttyHyvaksymispaatosVaiheJulkaisu,
  findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu,
} from "../util/lausuntoPyyntoUtil";
import { velho } from "../velho/velhoClient";
import { linkHyvaksymisPaatos } from "hassu-common/links";
import { deleteFilesUnderSpecifiedVaihe, deleteProjektiFilesFromYllapito } from "../HyvaksymisEsitys/s3Calls/deleteFiles";
import { ENNAKKONEUVOTTELU_JULKAISU_PATH, ENNAKKONEUVOTTELU_PATH } from "../ennakkoneuvottelu/tallenna";
import { getHyvaksymisEsityksenLadatutTiedostot } from "../HyvaksymisEsitys/getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot from "../HyvaksymisEsitys/getAineistot";
import { joinPath } from "../tiedostot/paths";

async function handleNahtavillaoloZipping(ctx: ImportContext) {
  if (!ctx.projekti.nahtavillaoloVaihe) {
    return;
  }
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
  const nahtavillaoloVaiheTiedostoManager = manager.getNahtavillaoloVaihe();
  const aineistopakettiFullS3Key =
    new ProjektiPaths(oid).nahtavillaoloVaihe(ctx.projekti.nahtavillaoloVaihe).yllapitoFullPath + "/aineisto.zip";
  log.info("luodaan nähtävilläolon aineistopaketti, key: " + aineistopakettiFullS3Key);
  await nahtavillaoloVaiheTiedostoManager.createZipOfAineisto(aineistopakettiFullS3Key, ctx.projekti.velho?.tyyppi);

  const aineistopakettiRelativeS3Key =
    new ProjektiPaths(oid).nahtavillaoloVaihe(ctx.projekti.nahtavillaoloVaihe).yllapitoPath + "/aineisto.zip";
  const nahtavillaoloVaihe = { ...ctx.projekti.nahtavillaoloVaihe };
  log.info("paivitetaan dbprojekti nähtävilläolon aineistopaketti-tiedolla: " + aineistopakettiRelativeS3Key);
  await projektiDatabase.saveProjektiWithoutLocking({
    oid,
    versio: ctx.projekti.versio,
    nahtavillaoloVaihe: { ...nahtavillaoloVaihe, aineistopaketti: "/" + aineistopakettiRelativeS3Key },
  });
}

async function handleLausuntoPyynnotZipping(ctx: ImportContext) {
  if (!ctx.projekti.lausuntoPyynnot) {
    return;
  }
  const oid = ctx.oid;
  const lausuntoPyynnotToBeHandled = ctx.projekti.lausuntoPyynnot;
  await Promise.all(
    lausuntoPyynnotToBeHandled
      .filter((lausuntoPyynto) => !lausuntoPyynto.poistetaan)
      .map((lausuntoPyynto) => eventSqsClient.zipSingleLausuntoPyynto(oid, lausuntoPyynto.uuid))
  );
}

async function handleLausuntoPyyntoZipping(ctx: ImportContext, uuid: string) {
  const lausuntoPyynnot = ctx.projekti.lausuntoPyynnot;
  if (!lausuntoPyynnot) {
    return;
  }
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
  const lausuntoPyyntoTiedostoManager = manager.getLausuntoPyynnot();

  const lausuntoPyynto = lausuntoPyynnot.find((lausuntoPyynto) => lausuntoPyynto.uuid === uuid);

  // Ei luoda turhaan aineistopakettia poistoa odottaville lausuntopyynnöille, mutta
  // pidetään ne mukana, koska niiden poistaminen käsitellään erikseen.
  if (!lausuntoPyynto || lausuntoPyynto.poistetaan) {
    return;
  }

  const aineistopakettiFullS3Key = new ProjektiPaths(oid).lausuntoPyynto(lausuntoPyynto).yllapitoFullPath + "/aineisto.zip";

  log.info("luodaan lausuntopyynnön aineistopaketti, key: " + aineistopakettiFullS3Key);
  await lausuntoPyyntoTiedostoManager.createZipOfAineisto(aineistopakettiFullS3Key, lausuntoPyynto.uuid, ctx.projekti.velho?.tyyppi);
  const aineistopakettiRelativeS3Key = new ProjektiPaths(oid).lausuntoPyynto(lausuntoPyynto).yllapitoPath + "/aineisto.zip";

  const lausuntoPyyntoWithAineistopaketti = { ...lausuntoPyynto, aineistopaketti: "/" + aineistopakettiRelativeS3Key };
  log.info("paivitetaan dbprojekti lausuntoPyynnon aineistopaketti-tiedolla: " + lausuntoPyyntoWithAineistopaketti.aineistopaketti);
  await projektiDatabase.saveProjektiWithoutLocking({
    oid,
    versio: ctx.projekti.versio,
    lausuntoPyynnot: lausuntoPyynnot.map((lausuntoPyynto) => {
      if (lausuntoPyynto.uuid === uuid) {
        return lausuntoPyyntoWithAineistopaketti;
      } else {
        return lausuntoPyynto;
      }
    }),
  });
}

async function handleLausuntoPyynnonTaydennyksetZipping(ctx: ImportContext) {
  if (!ctx.projekti.lausuntoPyynnonTaydennykset) {
    return;
  }
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
  const lausuntoPyynnonTaydennyksetAineisto = manager.getLausuntoPyynnonTaydennykset();
  const lausuntoPyynnonTaydennyksetToBeHandled = [...ctx.projekti.lausuntoPyynnonTaydennykset];
  const lausuntoPyynnonTaydennykset = await Promise.all(
    lausuntoPyynnonTaydennyksetToBeHandled.map(async (lausuntoPyynnonTaydennys) =>
      handleLausuntoPyynnonTaydennysZipping(oid, lausuntoPyynnonTaydennyksetAineisto, lausuntoPyynnonTaydennys)
    )
  );
  log.info(
    "paivitetaan dbprojekti lausuntoPyyntojenTaydennysten aineistopaketti-tiedolla: " +
      lausuntoPyynnonTaydennykset.map((lausuntoPyynto) => lausuntoPyynto.aineistopaketti).toString()
  );
  await projektiDatabase.saveProjektiWithoutLocking({
    oid,
    versio: ctx.projekti.versio,
    lausuntoPyynnonTaydennykset,
  });
}

async function handleLausuntoPyynnonTaydennysZipping(
  oid: string,
  lausuntoPyynnonTaydennyksetTiedostoManager: LausuntoPyynnonTaydennyksetTiedostoManager,
  lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys
): Promise<LausuntoPyynnonTaydennys> {
  // Ei luoda turhaan aineistopakettia poistoa odottaville lausuntopyynnöille, mutta
  // pidetään ne mukana, koska niiden poistaminen käsitellään erikseen.
  if (lausuntoPyynnonTaydennys.poistetaan) {
    return lausuntoPyynnonTaydennys;
  }
  const aineistopakettiFullS3Key =
    new ProjektiPaths(oid).lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys).yllapitoFullPath + "/aineisto.zip";

  log.info("luodaan lausuntopyynnön täydennyksen aineistopaketti, key: " + aineistopakettiFullS3Key);
  await lausuntoPyynnonTaydennyksetTiedostoManager.createZipOfAineisto(aineistopakettiFullS3Key, lausuntoPyynnonTaydennys.uuid);
  const aineistopakettiRelativeS3Key =
    new ProjektiPaths(oid).lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys).yllapitoPath + "/aineisto.zip";
  return { ...lausuntoPyynnonTaydennys, aineistopaketti: "/" + aineistopakettiRelativeS3Key };
}

async function handleChangedAineisto(ctx: ImportContext) {
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
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
    await eventSqsClient.zipNahtavillaoloAineisto(oid);
    await eventSqsClient.zipLausuntoPyyntoAineisto(oid);
  }
}

async function handleChangedFiles(ctx: ImportContext): Promise<void> {
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
  const vuorovaikutusKierros = await manager.getVuorovaikutusKierros().handleChangedTiedostot();
  const nahtavillaoloVaihe = await manager.getNahtavillaoloVaihe().handleChangedTiedostot();
  const lausuntoPyynnot = await manager.getLausuntoPyynnot().handleChangedTiedostot();
  const lausuntoPyynnonTaydennykset = await manager.getLausuntoPyynnonTaydennykset().handleChangedTiedostot();
  const hyvaksymisPaatosVaihe = await manager.getHyvaksymisPaatosVaihe().handleChangedTiedostot();
  const jatkoPaatos1Vaihe = await manager.getJatkoPaatos1Vaihe().handleChangedTiedostot();
  const jatkoPaatos2Vaihe = await manager.getJatkoPaatos2Vaihe().handleChangedTiedostot();
  // Päivitä vain jos on muuttuneita tietoja.
  if (
    vuorovaikutusKierros ||
    nahtavillaoloVaihe ||
    lausuntoPyynnot ||
    lausuntoPyynnonTaydennykset ||
    hyvaksymisPaatosVaihe ||
    jatkoPaatos1Vaihe ||
    jatkoPaatos2Vaihe
  ) {
    // Tässä tallennetaan tieto siitä, että aineistot on tuotu, ja poistettavaksi merkityt
    // aineistot, lausuntopyynnöt ja lausuntopyynnön täydennykset poistetaan oikeasti.
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      versio: ctx.projekti.versio,
      vuorovaikutusKierros,
      nahtavillaoloVaihe,
      lausuntoPyynnot,
      lausuntoPyynnonTaydennykset,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    });
  }

  for (const julkaisuAineisto of manager.getVuorovaikutusKierrosJulkaisut()) {
    const changes = await julkaisuAineisto.handleChangedTiedostot();
    if (changes) {
      log.info("Päivitetään vuorovaikutusKierrosJulkaisu tiedostojen poiston jälkeen", { vuorovaikutusKierrosJulkaisu: changes });
      await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(ctx.projekti, changes);
    }
  }

  if (nahtavillaoloVaihe) {
    await eventSqsClient.zipNahtavillaoloAineisto(oid);
  }
  if (lausuntoPyynnot) {
    await eventSqsClient.zipLausuntoPyyntoAineisto(oid);
  }
  if (lausuntoPyynnonTaydennykset) {
    await eventSqsClient.zipLausuntoPyynnonTaydennysAineisto(oid);
  }
}

async function handleChangedAineistoAndFiles(ctx: ImportContext) {
  const oid = ctx.oid;
  const manager: ProjektiTiedostoManager = ctx.manager;
  await manager.getVuorovaikutusKierros().handleChanges();
  await manager.getNahtavillaoloVaihe().handleChanges();
  await manager.getLausuntoPyynnot().handleChanges();
  await manager.getLausuntoPyynnonTaydennykset().handleChanges();
  await manager.getHyvaksymisPaatosVaihe().handleChanges();
  await manager.getJatkoPaatos1Vaihe().handleChanges();
  await manager.getJatkoPaatos2Vaihe().handleChanges();
  const vuorovaikutusKierros = await manager.getVuorovaikutusKierros().handleChangedTiedostot();
  const nahtavillaoloVaihe = await manager.getNahtavillaoloVaihe().handleChangedTiedostot();
  const lausuntoPyynnot = await manager.getLausuntoPyynnot().handleChangedTiedostot();
  const lausuntoPyynnonTaydennykset = await manager.getLausuntoPyynnonTaydennykset().handleChangedTiedostot();
  const hyvaksymisPaatosVaihe = await manager.getHyvaksymisPaatosVaihe().handleChangedTiedostot();
  const jatkoPaatos1Vaihe = await manager.getJatkoPaatos1Vaihe().handleChangedTiedostot();
  const jatkoPaatos2Vaihe = await manager.getJatkoPaatos2Vaihe().handleChangedTiedostot();
  // Päivitä vain jos on muuttuneita tietoja
  if (
    vuorovaikutusKierros ||
    nahtavillaoloVaihe ||
    lausuntoPyynnot ||
    lausuntoPyynnonTaydennykset ||
    hyvaksymisPaatosVaihe ||
    jatkoPaatos1Vaihe ||
    jatkoPaatos2Vaihe
  ) {
    await projektiDatabase.saveProjektiWithoutLocking({
      oid,
      versio: ctx.projekti.versio,
      vuorovaikutusKierros,
      nahtavillaoloVaihe,
      lausuntoPyynnot,
      lausuntoPyynnonTaydennykset,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    });
  }

  for (const julkaisuAineisto of manager.getVuorovaikutusKierrosJulkaisut()) {
    let changes = await julkaisuAineisto.handleChangedTiedostot();
    changes = (await julkaisuAineisto.handleChanges()) ?? changes;
    if (changes) {
      log.info("Päivitetään vuorovaikutusKierrosJulkaisu tiedostojen poiston jälkeen", { vuorovaikutusKierrosJulkaisu: changes });
      await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(ctx.projekti, changes);
    }
  }

  if (nahtavillaoloVaihe) {
    await eventSqsClient.zipNahtavillaoloAineisto(oid);
  }
  if (nahtavillaoloVaihe || lausuntoPyynnot) {
    await eventSqsClient.zipLausuntoPyyntoAineisto(oid);
  }
  if (lausuntoPyynnonTaydennykset) {
    await eventSqsClient.zipLausuntoPyynnonTaydennysAineisto(oid);
  }
}

async function handleOneMonthToInactive(ctx: ImportContext) {
  const kuukausiEpaaktiiviseenMail = createKuukausiEpaaktiiviseenEmail(ctx.projekti);
  if (kuukausiEpaaktiiviseenMail.to) {
    await emailClient.sendEmail(kuukausiEpaaktiiviseenMail);
  } else {
    log.error("Epäaktiivisuusmeilille ei löytynyt vastaanottaja sähköpostiosoitetta");
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

async function synchronizeSijaintitieto(ctx: ImportContext) {
  const status = ctx.projektiStatus;
  const projekti = ctx.projekti;
  if (status && status !== API.Status.EI_JULKAISTU && status !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).sijaintitieto(), dayjs("2000-01-01"));
  }
}

async function synchronizeAll(ctx: ImportContext): Promise<boolean> {
  await synchronizeEULogot(ctx);
  await synchronizeKuntaLogo(ctx);
  await synchronizeSijaintitieto(ctx);

  const manager: ProjektiTiedostoManager = ctx.manager;
  return (
    (await manager.getAloitusKuulutusVaihe().synchronize()) &&
    (await manager.getVuorovaikutusKierros().synchronize()) &&
    (await manager.getNahtavillaoloVaihe().synchronize()) &&
    (await manager.getHyvaksymisPaatosVaihe().synchronize()) &&
    (await manager.getJatkoPaatos1Vaihe().synchronize()) &&
    (await manager.getJatkoPaatos2Vaihe().synchronize())
  );
}

export const handlerFactory = (event: SQSEvent) => async () => {
  try {
    for (const record of event.Records) {
      const sqsEvent: SqsEvent = JSON.parse(record.body);
      const uuid: string | undefined = sqsEvent.uuid;
      if (sqsEvent.scheduleName) {
        await projektiSchedulerService.deletePastSchedule(sqsEvent.scheduleName);
      }
      log.info("sqsEvent", sqsEvent);
      const { oid } = sqsEvent;
      const projekti = await projektiDatabase.loadProjektiByOid(oid);
      if (!projekti) {
        throw new Error("Projektia " + oid + " ei löydy");
      }

      const ctx = await new ImportContext(projekti).init();
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
          // deprecated, kept until next production deployment
          // Tämä on täällä vielä siltä varalta, että tuotantoon viemisen hetkellä sqs-jonossa on IMPORT-eventtejä
          case SqsEventType.IMPORT:
            await handleChangedAineisto(ctx);
            break;
          case SqsEventType.AINEISTO_CHANGED:
            await handleChangedAineisto(ctx);
            break;
          case SqsEventType.FILES_CHANGED:
            await handleChangedFiles(ctx);
            break;
          case SqsEventType.AINEISTO_AND_FILES_CHANGED:
            await handleChangedAineistoAndFiles(ctx);
            break;
          case SqsEventType.ZIP:
            await handleNahtavillaoloZipping(ctx);
            break;
          case SqsEventType.ZIP_NAHTAVILLAOLO:
            await handleNahtavillaoloZipping(ctx);
            break;
          case SqsEventType.ZIP_LAUSUNTOPYYNNOT:
            await handleLausuntoPyynnotZipping(ctx);
            break;
          case SqsEventType.ZIP_LAUSUNTOPYYNTO:
            assertIsDefined(uuid, "ZIP_LAUSUNTOPYYNTO event should have uuid information");
            await handleLausuntoPyyntoZipping(ctx, uuid);
            break;
          case SqsEventType.ZIP_LAUSUNTOPYYNNON_TAYDENNYKSET:
            await handleLausuntoPyynnonTaydennyksetZipping(ctx);
            break;
          case SqsEventType.ONE_MONTH_TO_INACTIVE:
            await handleOneMonthToInactive(ctx);
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

      await checkEpaaktiivinen(ctx);

      // Synkronoidaan tiedostot aina
      const successfulSynchronization = await synchronizeAll(ctx);

      if (projekti && sqsEvent.type == SqsEventType.SYNCHRONIZE) {
        await projektiSearchService.indexProjekti(projekti);
        if (successfulSynchronization && sqsEvent.approvalType === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO) {
          const julkaisu = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
          if (!julkaisu?.uudelleenKuulutus || julkaisu.uudelleenKuulutus.tiedotaKiinteistonomistajia) {
            await lahetaSuomiFiViestit(projekti, sqsEvent.approvalType);
          } else {
            log.info("Ei Suomi.fi tiedoteta kiinteistönomistajia");
          }
        } else if (successfulSynchronization && sqsEvent.approvalType === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE) {
          const julkaisu = findLatestHyvaksyttyHyvaksymispaatosVaiheJulkaisu(projekti);
          if (!julkaisu?.uudelleenKuulutus || julkaisu.uudelleenKuulutus.tiedotaKiinteistonomistajia) {
            await lahetaSuomiFiViestit(projekti, sqsEvent.approvalType);
          } else {
            log.info("Ei Suomi.fi tiedoteta kiinteistönomistajia ja muistuttajia");
          }
        } else if (successfulSynchronization && sqsEvent.approvalType === PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS) {
          // Vaihdetaan suunnitelman tila Suunnittelu käynnissä tilaan
          if (!projekti.kasittelynTila) {
            projekti.kasittelynTila = {};
          }
          projekti.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil13";
          await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, kasittelynTila: projekti.kasittelynTila });
          await velho.saveProjektiSuunnitelmanTila(projekti.oid, projekti.kasittelynTila.suunnitelmanTila);
        } else if (
          successfulSynchronization &&
          sqsEvent.approvalType === PublishOrExpireEventType.EXPIRE &&
          sqsEvent.reason === HYVAKSYMISPAATOS_VAIHE_PAATTYY
        ) {
          // sähköposti Traficomille
          await lahetaSahkopostiTraficom(projekti);
        }
      }
      if (!successfulSynchronization) {
        // Yritä uudelleen minuutin päästä
        await eventSqsClient.addEventToSqsQueue(sqsEvent, true);
      }
    }
  } catch (e: unknown) {
    log.error(e);
    throw e;
  }
};

async function checkEpaaktiivinen(ctx: ImportContext) {
  if (ctx.projektiStatus == API.Status.EPAAKTIIVINEN_1) {
    await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
    if (ctx.projekti.ennakkoNeuvottelu || ctx.projekti.ennakkoNeuvotteluJulkaisu) {
      await projektiDatabase.deleteEnnakkoNeuvottelu(ctx.oid);
    }
    if (ctx.projekti.ennakkoNeuvotteluJulkaisu) {
      const tiedostot = await getHyvaksymisEsityksenLadatutTiedostot(ctx.projekti.ennakkoNeuvotteluJulkaisu);
      const aineistot = await getHyvaksymisEsityksenAineistot(ctx.projekti.ennakkoNeuvotteluJulkaisu);
      await deleteFilesUnderSpecifiedVaihe(
        ctx.oid,
        ENNAKKONEUVOTTELU_JULKAISU_PATH,
        [...tiedostot, ...aineistot],
        "Projekti epäaktiivinen"
      );
      await deleteProjektiFilesFromYllapito(ctx.oid, [joinPath(ENNAKKONEUVOTTELU_JULKAISU_PATH, "aineisto.zip")], "Projekti epäaktiivinen");
    }
    if (ctx.projekti.ennakkoNeuvottelu) {
      const tiedostot = await getHyvaksymisEsityksenLadatutTiedostot(ctx.projekti.ennakkoNeuvottelu);
      const aineistot = await getHyvaksymisEsityksenAineistot(ctx.projekti.ennakkoNeuvottelu);
      await deleteFilesUnderSpecifiedVaihe(ctx.oid, ENNAKKONEUVOTTELU_PATH, [...tiedostot, ...aineistot], "Projekti epäaktiivinen");
    }
  }
}

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", handlerFactory(event));
};

async function lahetaSahkopostiTraficom(projekti: DBProjekti) {
  log.info("Lähetetään sähköposti Traficomille");
  const julkaisu = findLatestHyvaksyttyHyvaksymispaatosVaiheJulkaisu(projekti);
  const text = `Hei,
Tiedoksenne, että suunnitelman ${projekti.velho?.nimi} hyväksymispäätöksen (${
    projekti.kasittelynTila?.hyvaksymispaatos?.asianumero
  }) nähtävilläoloaika on päättynyt ${dayjs(julkaisu?.kuulutusVaihePaattyyPaiva).format("DD.MM.YYYY")}.
Linkki kuulutukseen Valtion liikenneväylien suunnittelu -palvelussa: ${linkHyvaksymisPaatos(projekti, API.Kieli.SUOMI)}`;
  await emailClient.sendEmail({ to: "kirjaamo@traficom.fi", subject: "Hyväksymispäätöksen nähtävilläoloaika päättynyt", text });
}
