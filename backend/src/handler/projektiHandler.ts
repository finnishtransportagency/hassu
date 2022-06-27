import { projektiDatabase } from "../database/projektiDatabase";
import {
  getVaylaUser,
  requirePermissionLuku,
  requirePermissionLuonti,
  requirePermissionMuokkaa,
  requireVaylaUser,
} from "../user";
import { velho } from "../velho/velhoClient";
import * as API from "../../../common/graphql/apiModel";
import {
  ArkistointiTunnus,
  NykyinenKayttaja,
  ProjektiRooli,
  TallennaProjektiInput,
  Velho,
} from "../../../common/graphql/apiModel";
import {
  adaptVelho,
  ProjektiAdaptationResult,
  projektiAdapter,
  ProjektiEventType,
  VuorovaikutusPublishedEvent,
} from "./projektiAdapter";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import values from "lodash/values";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";
import { emailClient } from "../email/email";
import { createPerustamisEmail } from "../email/emailTemplates";
import { requireAdmin } from "../user/userService";
import { projektiArchive } from "../archive/projektiArchiveService";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./projektiAdapterJulkinen";
import { findUpdatedFields } from "../velho/velhoAdapter";
import { DBProjekti } from "../database/model";
import { vuorovaikutusService } from "../vuorovaikutus/vuorovaikutusService";
import { aineistoService } from "../aineisto/aineistoService";

export async function loadProjekti(oid: string): Promise<API.Projekti | API.ProjektiJulkinen> {
  const vaylaUser = getVaylaUser();
  if (vaylaUser) {
    return loadProjektiYllapito(oid, vaylaUser);
  } else {
    return loadProjektiJulkinen(oid);
  }
}

async function loadProjektiYllapito(oid: string, vaylaUser: NykyinenKayttaja): Promise<API.Projekti> {
  requirePermissionLuku();
  log.info("Loading projekti", { oid });
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    projektiFromDB.tallennettu = true;
    return projektiAdapter.adaptProjekti(projektiFromDB);
  } else {
    requirePermissionLuonti();
    const { projekti, virhetiedot: projektipaallikkoVirhetieto } = await createProjektiFromVelho(oid, vaylaUser);
    let virhetiedot: API.ProjektiVirhe | undefined;
    if (projektipaallikkoVirhetieto) {
      virhetiedot = { __typename: "ProjektiVirhe", projektipaallikko: projektipaallikkoVirhetieto };
    }

    return projektiAdapter.adaptProjekti(projekti, virhetiedot);
  }
}

export async function loadProjektiJulkinen(oid: string): Promise<API.ProjektiJulkinen> {
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid, false);
  if (projektiFromDB) {
    const adaptedProjekti = projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (adaptedProjekti) {
      return adaptedProjekti;
    }
    log.info("Projektilla ei ole julkista sisältöä", { oid });
    throw new NotFoundError("Projektilla ei ole julkista sisältöä: " + oid);
  }
  throw new NotFoundError("Projektia ei löydy: " + oid);
}

export async function arkistoiProjekti(oid: string): Promise<ArkistointiTunnus> {
  requireAdmin();
  return { __typename: "ArkistointiTunnus", ...(await projektiArchive.archiveProjekti(oid)) };
}

export async function createOrUpdateProjekti(input: TallennaProjektiInput): Promise<string> {
  requirePermissionLuku();
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    requirePermissionMuokkaa(projektiInDB);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(input);
    const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
    await projektiDatabase.saveProjekti(projektiAdaptationResult.projekti);
    await handleEvents(projektiAdaptationResult);
  } else {
    requirePermissionLuonti();
    const { projekti } = await createProjektiFromVelho(input.oid, requireVaylaUser(), input);
    log.info("Creating projekti to Hassu", { oid });
    await projektiDatabase.createProjekti(projekti);
    log.info("Created projekti to Hassu", { projekti });
    auditLog.info("Luo projekti", { projekti });

    const emailOptions = createPerustamisEmail(projekti);
    if (emailOptions.to) {
      await emailClient.sendEmail(emailOptions);
      log.info("Sent email to projektipaallikko", emailOptions.to);
    }
  }
  return input.oid;
}

export async function createProjektiFromVelho(
  oid: string,
  vaylaUser: NykyinenKayttaja,
  input?: TallennaProjektiInput
): Promise<{ projekti: DBProjekti; virhetiedot?: API.ProjektipaallikkoVirhe }> {
  try {
    log.info("Loading projekti from Velho", { oid });
    const { projekti, vastuuhenkilo } = await velho.loadProjekti(oid);
    const result: { projekti: DBProjekti; virhetiedot?: API.ProjektipaallikkoVirhe } = { projekti };

    const kayttoOikeudet = new KayttoOikeudetManager([], await personSearch.getKayttajas());

    if (input) {
      // Saving a new projekti, so adjusting data based on the input
      const { muistiinpano } = input;
      mergeWith(projekti, { muistiinpano });
      // Add new users given as inputs
      kayttoOikeudet.applyChanges(input.kayttoOikeudet);
    } else {
      // Loading a projekti from Velho for a first time
      const projektiPaallikko = kayttoOikeudet.addProjektiPaallikkoFromEmail(vastuuhenkilo);

      if (!vastuuhenkilo) {
        result.virhetiedot = { __typename: "ProjektipaallikkoVirhe", tyyppi: API.ProjektiPaallikkoVirheTyyppi.PUUTTUU };
      } else if (!projektiPaallikko) {
        result.virhetiedot = {
          __typename: "ProjektipaallikkoVirhe",
          tyyppi: API.ProjektiPaallikkoVirheTyyppi.EI_LOYDY,
          sahkoposti: vastuuhenkilo,
        };
      }

      // Prefill current user as sihteeri if it is different from project manager
      if ((!projektiPaallikko || projektiPaallikko.kayttajatunnus !== vaylaUser.uid) && vaylaUser.uid) {
        kayttoOikeudet.addUserByKayttajatunnus(vaylaUser.uid, ProjektiRooli.OMISTAJA);
      }
    }

    projekti.kayttoOikeudet = kayttoOikeudet.getKayttoOikeudet();
    return result;
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function findUpdatesFromVelho(oid: string): Promise<Velho> {
  try {
    log.info("Loading projekti", { oid });
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    requirePermissionMuokkaa(projektiFromDB);

    log.info("Loading projekti from Velho", { oid });
    const { projekti } = await velho.loadProjekti(oid);

    return adaptVelho(findUpdatedFields(projektiFromDB.velho, projekti.velho));
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function synchronizeUpdatesFromVelho(oid: string): Promise<Velho> {
  try {
    log.info("Loading projekti", { oid });
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    requirePermissionMuokkaa(projektiFromDB);

    log.info("Loading projekti from Velho", { oid });
    const { projekti } = await velho.loadProjekti(oid);

    const updatedFields = findUpdatedFields(projektiFromDB.velho, projekti.velho);
    const updatedVelhoValues = values(updatedFields);
    if (updatedVelhoValues.length > 0) {
      log.info("Muutoksia projektiin löytynyt Velhosta", { oid, updatedFields });
      await projektiDatabase.saveProjekti({ oid, velho: projekti.velho });
      return adaptVelho(updatedFields);
    } else {
      log.info("Muutoksia projektiin löytynyt Velhosta", { oid });
    }
  } catch (e) {
    log.error(e);
    throw e;
  }
}

/**
 * If there are uploaded files in the input, persist them into the project
 */
async function handleFiles(input: TallennaProjektiInput) {
  const logo = input.suunnitteluSopimus?.logo;
  if (logo && input.suunnitteluSopimus) {
    input.suunnitteluSopimus.logo = await fileService.persistFileToProjekti({
      uploadedFileSource: logo,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
  }
}

export async function requirePermissionMuokkaaProjekti(oid: string): Promise<DBProjekti> {
  requirePermissionLuku();
  log.info("Loading projekti", { oid });
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!projekti) {
    throw new NotFoundError("Projekti not found " + oid);
  }
  requirePermissionMuokkaa(projekti);
  return projekti;
}

async function handleEvents(projektiAdaptationResult: ProjektiAdaptationResult) {
  await projektiAdaptationResult.onEvent(
    ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
    async (event: VuorovaikutusPublishedEvent, projekti: DBProjekti) => {
      return vuorovaikutusService.handleVuorovaikutusKutsu(projekti.oid, event.vuorovaikutusNumero);
    }
  );
  await projektiAdaptationResult.onEvent(ProjektiEventType.AINEISTO_CHANGED, async (_event, projekti) => {
    return aineistoService.importAineisto(projekti.oid);
  });
}
