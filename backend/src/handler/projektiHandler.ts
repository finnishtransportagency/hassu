import { projektiDatabase } from "../database/projektiDatabase";
import { requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";
import { TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { ProjektiAdapter } from "./projektiAdapter";
import * as log from "loglevel";

const projektiAdapter = new ProjektiAdapter();

async function loadProjekti(oid: string) {
  requireVaylaUser();

  log.info("Loading projekti from Hassu ", oid);
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (projekti) {
    projekti.tallennettu = true;
    return projektiAdapter.adaptProjekti(projekti);
  } else {
    log.info("Loading projekti from Velho ", oid);
    return projektiAdapter.adaptProjekti(await velho.loadProjekti(oid));
  }
}

async function saveProjekti(projekti: TallennaProjektiInput) {
  requireVaylaUser();
  const oid = projekti.oid;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    log.info("Saving projekti ", projekti.oid);
    await projektiDatabase.saveProjekti(projektiAdapter.adaptProjectToSave(projekti));
  } else {
    // Create a new one
    try {
      log.info("Loading projekti from Velho ", projekti.oid);
      const velhoProjekti = await velho.loadProjekti(oid);
      log.info("Creating projekti to Hassu ", projekti.oid);
      const createdProjekti = projektiAdapter.adaptProjectToCreateNew(velhoProjekti);
      await projektiDatabase.createProjekti(createdProjekti);
      log.info("Created projekti to Hassu ", createdProjekti.oid);
    } catch (e) {
      log.error(e);
      throw e;
    }
  }
  return true;
}

export async function listProjektit() {
  // TODO list only public projects as public user
  const dbProjects = await projektiDatabase.listProjektit();
  return dbProjects.map(projektiAdapter.adaptProjekti);
}

export { loadProjekti, saveProjekti };
