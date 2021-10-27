import { projektiDatabase } from "../database/projektiDatabase";
import { getVaylaUser, requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";
import { Kayttaja, ProjektiRooli, Status, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { ProjektiAdapter } from "./projektiAdapter";
import * as log from "loglevel";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";

const projektiAdapter = new ProjektiAdapter();

async function loadProjekti(oid: string) {
  const vaylaUser = getVaylaUser();
  if (vaylaUser) {
    log.info("Loading projekti ", oid);
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (projektiFromDB) {
      projektiFromDB.tallennettu = true;
      return projektiAdapter.adaptProjekti(projektiFromDB);
    } else {
      const projekti = await createProjektiFromVelho(oid, vaylaUser);
      return projektiAdapter.adaptProjekti(projekti);
    }
  } else {
    throw new Error("Public access not implemented yet");
  }
}

async function createOrUpdateProjekti(input: TallennaProjektiInput) {
  requireVaylaUser();
  const oid = input.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    log.info("Saving projekti ", input.oid);
    await projektiDatabase.saveProjekti(await projektiAdapter.adaptProjektiToSave(projektiInDB, input));
  } else {
    const projekti = await createProjektiFromVelho(input.oid, getVaylaUser(), input);
    log.info("Creating projekti to Hassu ", projekti);
    await projektiDatabase.createProjekti(projekti);
    log.info("Created projekti to Hassu ", oid);
  }
  return true;
}

async function createProjektiFromVelho(oid: string, vaylaUser: Kayttaja, input?: TallennaProjektiInput) {
  try {
    log.info("Loading projekti from Velho ", oid);
    const { projekti, vastuuhenkilo } = await velho.loadProjekti(oid);

    // Set default state
    projekti.status = Status.EI_JULKAISTU;

    const kayttoOikeudet = new KayttoOikeudetManager([]);

    if (input) {
      // Saving a new projekti, so adjusting data based on the input
      const { kuvaus } = input;
      mergeWith(projekti, { kuvaus });
      // Add new users given as inputs
      await kayttoOikeudet.applyChanges(input.kayttoOikeudet);
    } else {
      // Loading a projekti from Velho for a first time
      const projektiPaallikko = await kayttoOikeudet.addProjektiPaallikkoFromEmail(vastuuhenkilo);

      // Prefill current user as sihteeri if it is different from project manager
      if ((!projektiPaallikko || projektiPaallikko.kayttajatunnus !== vaylaUser.uid) && vaylaUser.uid) {
        await kayttoOikeudet.addUserByKayttajatunnus(vaylaUser.uid, ProjektiRooli.OMISTAJA);
      }
    }

    projekti.kayttoOikeudet = kayttoOikeudet.getKayttoOikeudet();
    return projekti;
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function listProjektit() {
  // TODO list only public projects as public user
  const dbProjects = await projektiDatabase.listProjektit();
  return dbProjects.map(projektiAdapter.adaptProjekti);
}

export { loadProjekti, createOrUpdateProjekti };
