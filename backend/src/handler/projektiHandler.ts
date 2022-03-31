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
} from "../../../common/graphql/apiModel";
import { projektiAdapter } from "./projektiAdapter";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";
import { emailClient } from "../email/email";
import { createPerustamisEmail } from "../email/emailTemplates";
import { requireAdmin } from "../user/userService";
import { projektiArchive } from "../archive/projektiArchiveService";
import { NotFoundError } from "../error/NotFoundError";
import { projektiAdapterJulkinen } from "./projektiAdapterJulkinen";
import { DBProjekti } from "../database/model/projekti";
import { Aineisto } from "../database/model/suunnitteluVaihe";
import dayjs from "dayjs";
import { getAxios } from "../aws/monitoring";

export async function loadProjekti(oid: string): Promise<API.Projekti | API.ProjektiJulkinen> {
  const vaylaUser = getVaylaUser();
  if (vaylaUser) {
    return await loadProjektiYllapito(oid, vaylaUser);
  } else {
    return await loadProjektiJulkinen(oid);
  }
}

async function loadProjektiYllapito(oid: string, vaylaUser: NykyinenKayttaja): Promise<API.Projekti> {
  requirePermissionLuku();
  log.info("Loading projekti", { oid });
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    projektiFromDB.tallennettu = true;
    return projektiAdapter.applyStatus(projektiAdapter.adaptProjekti(projektiFromDB), { saved: true });
  } else {
    requirePermissionLuonti();
    const projekti = await createProjektiFromVelho(oid, vaylaUser);
    return projektiAdapter.adaptProjekti(projekti);
  }
}

async function loadProjektiJulkinen(oid: string): Promise<API.ProjektiJulkinen> {
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    const adaptedProjekti = projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (adaptedProjekti) {
      return projektiAdapterJulkinen.applyStatus(adaptedProjekti);
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
    const { projekti: projektiToSave, aineistotToDelete } = await projektiAdapter.adaptProjektiToSave(
      projektiInDB,
      input
    );
    await handleAineistot(projektiToSave, aineistotToDelete);
    await projektiDatabase.saveProjekti(projektiToSave);
  } else {
    requirePermissionLuonti();
    const projekti = await createProjektiFromVelho(input.oid, requireVaylaUser(), input);
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

async function createProjektiFromVelho(oid: string, vaylaUser: NykyinenKayttaja, input?: TallennaProjektiInput) {
  try {
    log.info("Loading projekti from Velho", { oid });
    const { projekti, vastuuhenkilo } = await velho.loadProjekti(oid);

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
  if (logo && input.suunnitteluSopimus) {
    input.suunnitteluSopimus.logo = await fileService.persistFileToProjekti({
      uploadedFileSource: logo,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
  }
}

function parseFilenameFromContentDisposition(disposition?: string) {
  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-\\.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  let fileName: string = null;
  if (utf8FilenameRegex.test(disposition)) {
    fileName = decodeURIComponent(utf8FilenameRegex.exec(disposition)[1]);
  } else {
    const matches = asciiFilenameRegex.exec(disposition);
    if (matches != null && matches[2]) {
      fileName = matches[2];
    }
  }
  return fileName;
}

/**
 * If there are uploaded files in the input, persist them into the project
 */
async function handleAineistot(projekti: DBProjekti, aineistotToDelete?: Aineisto[]) {
  const axios = getAxios();

  const vuorovaikutus = projekti.vuorovaikutukset?.[0];
  const aineistot = vuorovaikutus?.aineistot;
  if (aineistot) {
    for (const aineisto of aineistot) {
      if (aineisto.tiedosto == "") {
        // Import file from Velho
        const sourceURL = await velho.getLinkForDocument(aineisto.dokumenttiOid);
        const axiosResponse = await axios.get(sourceURL);
        const filePathInProjekti = "suunnitteluvaihe/vuorovaikutus_" + vuorovaikutus.vuorovaikutusNumero;
        const fileName = parseFilenameFromContentDisposition(axiosResponse.headers["content-disposition"]);
        aineisto.tiedosto = await fileService.createFileToProjekti({
          oid: projekti.oid,
          filePathInProjekti,
          fileName,
          contents: axiosResponse.data,
        });
        aineisto.tuotu = dayjs().format();
        log.info("Tuotiin tiedosto Velhosta", { oid: projekti.oid, filePathInProjekti, fileName });
      }
    }
    await Promise.all(
      aineistotToDelete?.map(async (aineisto) => {
        log.info("Poistetaan aineisto", aineisto);
        return await fileService.deleteFileFromProjekti({
          oid: projekti.oid,
          fullFilePathInProjekti: aineisto.tiedosto,
        });
      })
    );
  }
}
