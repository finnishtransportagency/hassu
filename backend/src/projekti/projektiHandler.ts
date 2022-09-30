import { projektiDatabase } from "../database/projektiDatabase";
import { getVaylaUser, requirePermissionLuku, requirePermissionLuonti, requirePermissionMuokkaa, requireVaylaUser } from "../user";
import { velho } from "../velho/velhoClient";
import * as API from "../../../common/graphql/apiModel";
import { KayttajaTyyppi, NykyinenKayttaja, TallennaProjektiInput, Velho } from "../../../common/graphql/apiModel";
import {
  ProjektiAdaptationResult,
  projektiAdapter,
  ProjektiEventType,
  ProjektiEvent,
  VuorovaikutusPublishedEvent,
} from "./adapter/projektiAdapter";
import { adaptVelhoByAddingTypename } from "./adapter/common";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import values from "lodash/values";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";
import { emailClient } from "../email/email";
import { createPerustamisEmail } from "../email/emailTemplates";
import { requireAdmin, requireOmistaja } from "../user/userService";
import { projektiArchive } from "../archive/projektiArchiveService";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";
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

export async function arkistoiProjekti(oid: string): Promise<string> {
  requireAdmin();
  return projektiArchive.archiveProjekti(oid);
}

function verifyTallennaProjektiPermissions(projektiInDB: DBProjekti, input: TallennaProjektiInput) {
  requirePermissionMuokkaa(projektiInDB);
  if (input.kasittelynTila) {
    requireAdmin("Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja");
  }

  // Vain omistaja voi muokata projektiPaallikonVarahenkilo-kenttää
  if (
    // Etsi kentät, joita yritetään muokata
    input.kayttoOikeudet
      ?.filter((kayttoOikeus) => kayttoOikeus.tyyppi === null || kayttoOikeus.tyyppi === KayttajaTyyppi.VARAHENKILO)
      // Suodata vain muokattavissa olevat käyttäjät
      .filter((kayttoOikeus) => {
        const dbVaylaUser = projektiInDB.kayttoOikeudet.filter((kayttaja) => kayttaja.kayttajatunnus == kayttoOikeus.kayttajatunnus).pop();
        return dbVaylaUser && dbVaylaUser.muokattavissa === true;
      })
      .pop()
  ) {
    requireOmistaja(projektiInDB);
  }
}

export async function createOrUpdateProjekti(input: TallennaProjektiInput): Promise<string> {
  requirePermissionLuku();
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    verifyTallennaProjektiPermissions(projektiInDB, input);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(input);
    const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
    await projektiDatabase.saveProjekti(projektiAdaptationResult.projekti);
    await handleEvents(projektiAdaptationResult);
  } else {
    requirePermissionLuonti();
    const { projekti } = await createProjektiFromVelho(input.oid, requireVaylaUser(), input);
    verifyTallennaProjektiPermissions(projekti, input);
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
    const projekti = await velho.loadProjekti(oid);
    if (!projekti.velho) {
      throw new Error("projekti.velho ei ole määritelty");
    }
    const vastuuhenkilonEmail = projekti.velho.vastuuhenkilonEmail;
    const varahenkilonEmail = projekti.velho.varahenkilonEmail;

    const kayttoOikeudet = new KayttoOikeudetManager([], await personSearch.getKayttajas());
    const projektiPaallikko = kayttoOikeudet.addProjektiPaallikkoFromEmail(vastuuhenkilonEmail);
    kayttoOikeudet.addVarahenkiloFromEmail(varahenkilonEmail);

    const result: { projekti: DBProjekti; virhetiedot?: API.ProjektipaallikkoVirhe } = { projekti };
    if (input) {
      // Saving a new projekti, so adjusting data based on the input
      const { muistiinpano } = input;
      mergeWith(projekti, { muistiinpano });
      // Add new users given as inputs
      kayttoOikeudet.applyChanges(input.kayttoOikeudet);
    } else {
      if (!vastuuhenkilonEmail) {
        result.virhetiedot = { __typename: "ProjektipaallikkoVirhe", tyyppi: API.ProjektiPaallikkoVirheTyyppi.PUUTTUU };
      } else if (!projektiPaallikko) {
        result.virhetiedot = {
          __typename: "ProjektipaallikkoVirhe",
          tyyppi: API.ProjektiPaallikkoVirheTyyppi.EI_LOYDY,
          sahkoposti: vastuuhenkilonEmail,
        };
      }

      // Prefill current user as varahenkilo if it is different from project manager
      if ((!projektiPaallikko || projektiPaallikko.kayttajatunnus !== vaylaUser.uid) && vaylaUser.uid) {
        kayttoOikeudet.addUser({ kayttajatunnus: vaylaUser.uid, muokattavissa: true, tyyppi: KayttajaTyyppi.VARAHENKILO });
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
    if (!projektiFromDB) {
      throw new Error(`Projektia oid:lla ${oid} ei löydy`);
    }
    requirePermissionMuokkaa(projektiFromDB);

    log.info("Loading projekti from Velho", { oid });
    const projekti = await velho.loadProjekti(oid);

    if (!projekti.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy velhosta projekti.velho-tietoa.`);
    }
    if (!projektiFromDB.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy hassusta projekti.velho-tietoa.`);
    }
    return adaptVelhoByAddingTypename(findUpdatedFields(projektiFromDB.velho, projekti.velho));
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function synchronizeUpdatesFromVelho(oid: string): Promise<Velho | undefined> {
  try {
    log.info("Loading projekti", { oid });
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      throw new Error(`Projektia oid:lla ${oid} ei löydy`);
    }
    requirePermissionMuokkaa(projektiFromDB);

    log.info("Loading projekti from Velho", { oid });
    const projekti = await velho.loadProjekti(oid);
    if (!projekti.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy velhosta projekti.velho-tietoa.`);
    }
    if (!projektiFromDB.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy hassusta projekti.velho-tietoa.`);
    }

    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.addProjektiPaallikkoFromEmail(projekti.velho.vastuuhenkilonEmail);
    kayttoOikeudetManager.addVarahenkiloFromEmail(projekti.velho.varahenkilonEmail);
    const updatedFields = findUpdatedFields(projektiFromDB.velho, projekti.velho);
    const updatedVelhoValues = values(updatedFields);
    if (updatedVelhoValues.length > 0) {
      log.info("Muutoksia projektiin löytynyt Velhosta", { oid, updatedFields });
      await projektiDatabase.saveProjekti({ oid, velho: projekti.velho, kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet() });
      return adaptVelhoByAddingTypename(updatedFields);
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
  await projektiAdaptationResult.onEvent(ProjektiEventType.VUOROVAIKUTUS_PUBLISHED, async (event: ProjektiEvent, projekti: DBProjekti) => {
    if (!(event as VuorovaikutusPublishedEvent).vuorovaikutusNumero) {
      throw new Error("handleEvents: event is missing vuorovaikutusNumero");
    }
    return vuorovaikutusService.handleVuorovaikutusKutsu(projekti.oid, (event as VuorovaikutusPublishedEvent).vuorovaikutusNumero);
  });
  await projektiAdaptationResult.onEvent(ProjektiEventType.AINEISTO_CHANGED, async (_event, projekti) => {
    return aineistoService.importAineisto(projekti.oid);
  });
}
