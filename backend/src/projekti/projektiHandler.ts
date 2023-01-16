import { projektiDatabase } from "../database/projektiDatabase";
import {
  getVaylaUser,
  requireAdmin,
  requirePermissionLuku,
  requirePermissionLuonti,
  requirePermissionMuokkaa,
  requireVaylaUser,
} from "../user";
import { velho } from "../velho/velhoClient";
import * as API from "../../../common/graphql/apiModel";
import { projektiAdapter } from "./adapter/projektiAdapter";
import { adaptVelho } from "./adapter/common";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";
import { emailClient } from "../email/email";
import { createPerustamisEmail } from "../email/emailTemplates";
import { projektiArchive } from "../archive/projektiArchiveService";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";
import { findUpdatedFields } from "../velho/velhoAdapter";
import {
  DBProjekti,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import { aineistoService } from "../aineisto/aineistoService";
import { ProjektiAdaptationResult, ProjektiEventType } from "./adapter/projektiAdaptationResult";
import remove from "lodash/remove";
import { validatePaivitaPerustiedot, validatePaivitaVuorovaikutus, validateTallennaProjekti } from "./projektiValidator";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { adaptStandardiYhteystiedotInputToYhteystiedotToSave, adaptVuorovaikutusKierrosAfterPerustiedotUpdate } from "./adapter/adaptToDB";
import { asiakirjaAdapter } from "../handler/asiakirjaAdapter";
import { vuorovaikutusKierrosTilaManager } from "../handler/tila/vuorovaikutusKierrosTilaManager";

export async function loadProjekti(oid: string): Promise<API.Projekti | API.ProjektiJulkinen> {
  const vaylaUser = getVaylaUser();
  if (vaylaUser) {
    return loadProjektiYllapito(oid, vaylaUser);
  } else {
    return loadProjektiJulkinen(oid);
  }
}

async function loadProjektiYllapito(oid: string, vaylaUser: API.NykyinenKayttaja): Promise<API.Projekti> {
  requirePermissionLuku();
  log.info("Loading projekti", { oid });
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
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

export async function createOrUpdateProjekti(input: API.TallennaProjektiInput): Promise<string> {
  requirePermissionLuku();
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    validateTallennaProjekti(projektiInDB, input);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(projektiInDB, input);
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

export async function updateVuorovaikutus(input: API.VuorovaikutusPaivitysInput | null | undefined): Promise<string> {
  if (!input) {
    throw new IllegalArgumentError("input puuttuu!");
  }
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    requirePermissionMuokkaa(projektiInDB);
    validatePaivitaVuorovaikutus(projektiInDB, input);
    auditLog.info("Päivitä vuorovaikutuskierros", { input });

    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuus[] = input.vuorovaikutusTilaisuudet.map((tilaisuus, index) =>
      mergeWith(projektiInDB.vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.[index], tilaisuus)
    );
    const vuorovaikutusTilaisuusJulkaisut: VuorovaikutusTilaisuusJulkaisu[] = vuorovaikutusTilaisuudet.map((tilaisuus) => {
      const vuorovaikutusTilaisuusJulkaisu: VuorovaikutusTilaisuusJulkaisu = {
        ...tilaisuus,
        yhteystiedot: adaptStandardiYhteystiedotInputToYhteystiedotToSave(projektiInDB, tilaisuus.esitettavatYhteystiedot),
      };
      return vuorovaikutusTilaisuusJulkaisu;
    });
    const vuorovaikutusKierros = {
      ...(projektiInDB.vuorovaikutusKierros as VuorovaikutusKierros),
      vuorovaikutusTilaisuudet,
    };
    const vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] = [
      ...(projektiInDB.vuorovaikutusKierrosJulkaisut as VuorovaikutusKierrosJulkaisu[]),
    ];
    vuorovaikutusKierrosJulkaisut[input.vuorovaikutusNumero] = {
      ...vuorovaikutusKierrosJulkaisut[input.vuorovaikutusNumero],
      vuorovaikutusTilaisuudet: vuorovaikutusTilaisuusJulkaisut,
    };
    await projektiDatabase.saveProjekti({
      oid: input.oid,
      versio: input.versio,
      vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut,
    });
    return input.oid;
  } else {
    throw new IllegalArgumentError("Projektia ei ole olemassa");
  }
}

export async function updatePerustiedot(input: API.VuorovaikutusPerustiedotInput | null | undefined): Promise<string> {
  requirePermissionLuku();
  if (!input) {
    throw new IllegalArgumentError("input puuttuu!");
  }
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    validatePaivitaPerustiedot(projektiInDB, input);
    auditLog.info("Päivitä perustiedot", { input });
    const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult(projektiInDB);
    const vuorovaikutusKierros = adaptVuorovaikutusKierrosAfterPerustiedotUpdate(projektiInDB, input, projektiAdaptationResult);
    const vuorovaikutusKierrosJulkaisu = asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu({ ...projektiInDB, vuorovaikutusKierros });
    await vuorovaikutusKierrosTilaManager.generatePDFsForJulkaisu(vuorovaikutusKierrosJulkaisu, projektiInDB);

    const vuorovaikutusKierrosJulkaisut = projektiInDB.vuorovaikutusKierrosJulkaisut;
    vuorovaikutusKierrosJulkaisut?.pop();
    vuorovaikutusKierrosJulkaisut?.push(vuorovaikutusKierrosJulkaisu);

    await projektiDatabase.saveProjekti({
      oid: input.oid,
      versio: input.versio,
      vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut,
    });
    await handleEvents(projektiAdaptationResult); // Täältä voi tulla IMPORT-eventtejä, jos aineistot muuttuivat.
    return input.oid;
  } else {
    throw new IllegalArgumentError("Projektia ei ole olemassa");
  }
}

export async function createProjektiFromVelho(
  oid: string,
  vaylaUser: API.NykyinenKayttaja,
  input?: API.TallennaProjektiInput
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
        kayttoOikeudet.addUser({ kayttajatunnus: vaylaUser.uid, muokattavissa: true, tyyppi: API.KayttajaTyyppi.VARAHENKILO });
      }
    }

    projekti.kayttoOikeudet = kayttoOikeudet.getKayttoOikeudet();
    return result;
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function findUpdatesFromVelho(oid: string): Promise<API.Velho> {
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
    return adaptVelho(findUpdatedFields(projektiFromDB.velho, projekti.velho));
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function synchronizeUpdatesFromVelho(oid: string, reset = false): Promise<API.Velho | undefined> {
  try {
    log.info("Loading projekti", { oid });
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      throw new Error(`Projektia oid:lla ${oid} ei löydy`);
    }
    requirePermissionMuokkaa(projektiFromDB);

    log.info("Loading projekti from Velho", { oid });
    const projektiFromVelho = await velho.loadProjekti(oid);
    if (!projektiFromVelho.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy velhosta projekti.velho-tietoa.`);
    }
    if (!projektiFromDB.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy hassusta projekti.velho-tietoa.`);
    }

    const vastuuhenkilonEmail = projektiFromVelho.velho.vastuuhenkilonEmail;
    const varahenkilonEmail = projektiFromVelho.velho.varahenkilonEmail;

    const kayttoOikeudet = projektiFromDB.kayttoOikeudet;
    if (reset) {
      // Poista kaikki muut paitsi tuleva projektipäällikkö ja vastuuhenkilö
      remove(kayttoOikeudet, (user) => user.email !== vastuuhenkilonEmail && user.email !== varahenkilonEmail);
    }
    const kayttoOikeudetManager = new KayttoOikeudetManager(
      kayttoOikeudet,
      await personSearch.getKayttajas(),
      projektiFromDB.suunnitteluSopimus?.yhteysHenkilo
    );
    kayttoOikeudetManager.addProjektiPaallikkoFromEmail(vastuuhenkilonEmail);
    kayttoOikeudetManager.addVarahenkiloFromEmail(varahenkilonEmail);
    const kayttoOikeudetNew = kayttoOikeudetManager.getKayttoOikeudet();

    const updatedFields = findUpdatedFields(projektiFromDB.velho, projektiFromVelho.velho);
    await projektiDatabase.saveProjektiWithoutLocking({ oid, velho: projektiFromVelho.velho, kayttoOikeudet: kayttoOikeudetNew });
    return adaptVelho(updatedFields);
  } catch (e) {
    log.error(e);
    throw e;
  }
}

/**
 * If there are uploaded files in the input, persist them into the project
 */
async function handleFiles(dbProjekti: DBProjekti, input: API.TallennaProjektiInput) {
  const logo = input.suunnitteluSopimus?.logo;
  if (logo && input.suunnitteluSopimus) {
    input.suunnitteluSopimus.logo = await fileService.persistFileToProjekti({
      uploadedFileSource: logo,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    const julkinenStatus = projektiAdapterJulkinen.adaptProjekti(dbProjekti)?.status;

    // Projekti status should at least be published (aloituskuulutus) until the logo is published to public
    if (julkinenStatus && julkinenStatus !== API.Status.EI_JULKAISTU && julkinenStatus !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT) {
      await fileService.publishProjektiFile(input.oid, input.suunnitteluSopimus.logo, input.suunnitteluSopimus.logo);
    }
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

async function saveProjektiToVelho(projekti: DBProjekti) {
  const kasittelynTila = projekti.kasittelynTila;
  if (kasittelynTila) {
    requireAdmin();
    await velho.saveProjekti(projekti.oid, kasittelynTila);
  }
}

async function handleEvents(projektiAdaptationResult: ProjektiAdaptationResult) {
  await projektiAdaptationResult.onEvent(ProjektiEventType.SAVE_PROJEKTI_TO_VELHO, async () => {
    await saveProjektiToVelho(projektiAdaptationResult.projekti);
  });

  await projektiAdaptationResult.onEvent(ProjektiEventType.RESET_KAYTTOOIKEUDET, async (_event, oid) => {
    await synchronizeUpdatesFromVelho(oid, true);
  });

  await projektiAdaptationResult.onEvent(ProjektiEventType.AINEISTO_CHANGED, async (_event, oid) => {
    return aineistoService.importAineisto(oid);
  });
}
