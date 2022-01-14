import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku, requirePermissionLuonti, requirePermissionMuokkaa, requireVaylaUser } from "../user";
import { velho } from "../velho/velhoClient";
import { NykyinenKayttaja, ProjektiRooli, Status, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { projektiAdapter } from "./projektiAdapter";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";

export async function loadProjekti(oid: string) {
  const vaylaUser = requirePermissionLuku();
  if (vaylaUser) {
    log.info("Loading projekti", { oid });
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (projektiFromDB) {
      projektiFromDB.tallennettu = true;
      return projektiAdapter.adaptProjekti(projektiFromDB);
    } else {
      requirePermissionLuonti();
      const projekti = await createProjektiFromVelho(oid, vaylaUser);
      return projektiAdapter.adaptProjekti(projekti);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}

export async function createOrUpdateProjekti(input: TallennaProjektiInput) {
  requirePermissionLuku();
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    requirePermissionMuokkaa(projektiInDB);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(input);
    await projektiDatabase.saveProjekti(await projektiAdapter.adaptProjektiToSave(projektiInDB, input));
  } else {
    requirePermissionLuonti();
    const projekti = await createProjektiFromVelho(input.oid, requireVaylaUser(), input);
    log.info("Creating projekti to Hassu", { oid });
    await projektiDatabase.createProjekti(projekti);
    log.info("Created projekti to Hassu", { projekti });
    auditLog.info("Luo projekti", { projekti });
  }
  return input.oid;
}

async function createProjektiFromVelho(oid: string, vaylaUser: NykyinenKayttaja, input?: TallennaProjektiInput) {
  try {
    log.info("Loading projekti from Velho", { oid });
    const { projekti, vastuuhenkilo } = await velho.loadProjekti(oid);

    // Set default state
    projekti.status = Status.EI_JULKAISTU;

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

      // Prefill current user as sihteeri if it is different from project manager
      if ((!projektiPaallikko || projektiPaallikko.kayttajatunnus !== vaylaUser.uid) && vaylaUser.uid) {
        kayttoOikeudet.addUserByKayttajatunnus(vaylaUser.uid, ProjektiRooli.OMISTAJA);
      }
    }

    projekti.kayttoOikeudet = kayttoOikeudet.getKayttoOikeudet();
    return projekti;
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
  if (logo) {
    input.suunnitteluSopimus.logo = await fileService.persistFileToProjekti({
      uploadedFileSource: logo,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
  }
}

export async function listProjektit() {
  const dbProjects = await projektiDatabase.listProjektit();
  return dbProjects.map(projektiAdapter.adaptProjekti);
}
