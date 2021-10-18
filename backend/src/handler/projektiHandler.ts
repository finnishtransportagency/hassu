import { projektiDatabase } from "../database/projektiDatabase";
import { getVaylaUser, requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";
import { Kayttaja, ProjektiRooli, Status, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { ProjektiAdapter } from "./projektiAdapter";
import * as log from "loglevel";
import { DBProjekti } from "../database/model/projekti";
import { personSearch, SearchMode } from "../personSearch/personSearchClient";
import { adaptKayttaja } from "../personSearch/personAdapter";

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
    await projektiDatabase.saveProjekti(projektiAdapter.adaptProjektiToSave(projektiInDB, input));
  } else {
    const projekti = await createProjektiFromVelho(input.oid, getVaylaUser());
    projektiAdapter.mergeProjektiInput(projekti, input);
    log.info("Creating projekti to Hassu ", projekti);
    await projektiDatabase.createProjekti(projekti);
    log.info("Created projekti to Hassu ", oid);
  }
  return true;
}

async function resolveProjektiPaallikkoFromVelhoVastuuhenkilo(projekti: DBProjekti) {
  // Fill in project manager details from user directory
  const projektiPaallikko = projekti.kayttoOikeudet?.filter(
    (user) => user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO
  )[0];
  if (projektiPaallikko) {
    const succeeded = await personSearch.fillInUserInfoFromUserManagement({
      user: projektiPaallikko,
      searchMode: SearchMode.EMAIL,
    });
    if (!succeeded) {
      projekti.kayttoOikeudet = projekti.kayttoOikeudet.filter((user) => user.email !== projektiPaallikko.email);
    }
  }
  return projektiPaallikko;
}

async function addCurrentUserAsOmistaja(vaylaUser: Kayttaja, projekti: DBProjekti) {
  const omistaja = adaptKayttaja(vaylaUser);
  const succeeded = await personSearch.fillInUserInfoFromUserManagement({
    user: omistaja,
    searchMode: SearchMode.UID,
  });
  if (succeeded) {
    omistaja.rooli = ProjektiRooli.OMISTAJA;
    projekti.kayttoOikeudet.push(omistaja);
  }
}

async function createProjektiFromVelho(oid: string, vaylaUser: Kayttaja) {
  try {
    log.info("Loading projekti from Velho ", oid);
    const { projekti, vastuuhenkilo } = await velho.loadProjekti(oid);

    // Set default state
    projekti.status = Status.EI_JULKAISTU;

    projekti.kayttoOikeudet.push({ rooli: ProjektiRooli.PROJEKTIPAALLIKKO, email: vastuuhenkilo } as any);
    const projektiPaallikko = await resolveProjektiPaallikkoFromVelhoVastuuhenkilo(projekti);

    // Prefill current user as sihteeri if it is different from project manager
    if (!projektiPaallikko || projektiPaallikko.kayttajatunnus !== vaylaUser.uid) {
      await addCurrentUserAsOmistaja(vaylaUser, projekti);
    }
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
