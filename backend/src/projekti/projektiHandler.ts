import { projektiDatabase } from "../database/projektiDatabase";
import { requireAdmin, requirePermissionLuku, requirePermissionLuonti, requirePermissionMuokkaa, requireVaylaUser } from "../user";
import { velho as velhoClient } from "../velho/velhoClient";
import * as API from "hassu-common/graphql/apiModel";
import { projektiAdapter } from "./adapter/projektiAdapter";
import { auditLog, log } from "../logger";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import mergeWith from "lodash/mergeWith";
import { fileService } from "../files/fileService";
import { personSearch } from "../personSearch/personSearchClient";
import { emailClient } from "../email/email";
import { createPerustamisEmail } from "../email/emailTemplates";
import { projektiArchive } from "../archive/projektiArchiveService";
import { NotFoundError } from "hassu-common/error";
import { findUpdatedFields } from "../velho/velhoAdapter";
import {
  DBProjekti,
  LadattuTiedosto,
  PartialDBProjekti,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import { ProjektiAdaptationResult, ProjektiEvent, ProjektiEventType } from "./adapter/projektiAdaptationResult";
import { validateTallennaProjekti } from "./validator/projektiValidator";
import { IllegalArgumentError } from "hassu-common/error/IllegalArgumentError";
import {
  adaptStandardiYhteystiedotInputToYhteystiedotToSave,
  adaptVuorovaikutusKierrosAfterPerustiedotUpdate,
  forEverySaameDoAsync,
} from "./adapter/adaptToDB";
import { asiakirjaAdapter } from "../handler/asiakirjaAdapter";
import { vuorovaikutusKierrosTilaManager } from "../handler/tila/vuorovaikutusKierrosTilaManager";
import { ProjektiTiedostoManager } from "../tiedostot/ProjektiTiedostoManager";
import { assertIsDefined } from "../util/assertions";
import { lyhytOsoiteDatabase } from "../database/lyhytOsoiteDatabase";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { requireOmistaja } from "../user/userService";
import { isEmpty } from "lodash";
import { eventSqsClient } from "../sqsEvents/eventSqsClient";
import { preventArrayMergingCustomizer } from "../util/preventArrayMergingCustomizer";
import { TallennaJaSiirraTilaaMutationVariables } from "hassu-common/graphql/apiModel";
import { tilaHandler } from "../handler/tila/tilaHandler";
import { deleteFile, persistLadattuTiedosto } from "../files/persistFiles";
import { asianhallintaService } from "../asianhallinta/asianhallintaService";
import { isProjektiAsianhallintaIntegrationEnabled } from "../util/isProjektiAsianhallintaIntegrationEnabled";
import { validatePaivitaVuorovaikutus } from "./validator/validatePaivitaVuorovaikutus";
import { validatePaivitaPerustiedot } from "./validator/validatePaivitaPerustiedot";
import { adaptVelhoToAPI } from "./adapter/adaptToAPI";
import { adaptOmistajahakuTila } from "./adapter/adaptToAPI/adaptOmistajahakuTila";
import { muistuttajaSearchService } from "../projektiSearch/muistuttajaSearch/muistuttajaSearchService";
import { omistajaDatabase } from "../database/omistajaDatabase";
import { config } from "../config";
import { haeLiittyvanProjektinTiedot } from "./haeLiittyvanProjektinTiedot";
import { lisaaJakotiedotJulkaisuille } from "./lisaaJakotiedotJulkaisuille";
import { haeJaetunProjektinOid } from "./haeJaetunProjektinOid";
import { getCorrelationId } from "../aws/monitoring";

export async function projektinTila(oid: string): Promise<API.ProjektinTila> {
  requirePermissionLuku();
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    const aineistoManager = new ProjektiTiedostoManager(projektiFromDB);
    return {
      __typename: "ProjektinTila",
      aineistotValmiit: aineistoManager.isReady(),
    };
  } else {
    throw new NotFoundError("Projektia ei löydy: " + oid);
  }
}

export async function haeProjektinTiedottamistiedot(oid: string): Promise<API.ProjektinTiedottaminen> {
  requirePermissionLuku();
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    const omistajahakuTila = adaptOmistajahakuTila(projektiFromDB);
    const muistuttajaMaara = await muistuttajaSearchService.getMuistuttajaMaara(oid);

    if (omistajahakuTila === API.OmistajahakuTila.KAYNNISSA) {
      return {
        __typename: "ProjektinTiedottaminen",
        omistajahakuTila,
        muistuttajaMaara,
        kiinteistotunnusMaara: projektiFromDB.omistajahaku?.kiinteistotunnusMaara ?? null,
        oid,
      };
    }
    const omistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(oid, "kiinteistotunnus");
    return {
      __typename: "ProjektinTiedottaminen",
      omistajahakuTila,
      kiinteistonomistajaMaara: omistajat.length ?? null,
      kiinteistotunnusMaara: new Set(omistajat.filter((o) => o.kiinteistotunnus).map((o) => o.kiinteistotunnus)).size,
      muistuttajaMaara,
      oid,
    };
  } else {
    throw new NotFoundError("Projektia ei löydy: " + oid);
  }
}

export async function loadProjektiYllapito(oid: string): Promise<API.Projekti> {
  const vaylaUser = requirePermissionLuku();
  log.info("Loading projekti", { oid });
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    const apiProjekti = await projektiAdapter.adaptProjekti(projektiFromDB);
    await lisaaApiAineistolleTiedostokoko(apiProjekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos);
    await lisaaApiAineistolleTiedostokoko(apiProjekti.jatkoPaatos1Vaihe?.hyvaksymisPaatos);
    await lisaaApiAineistolleTiedostokoko(apiProjekti.jatkoPaatos2Vaihe?.hyvaksymisPaatos);
    await lisaaSuunnitelmanJakotiedotProjektilleJaSenJulkaisuille(projektiFromDB, apiProjekti);
    return apiProjekti;
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

async function lisaaSuunnitelmanJakotiedotProjektilleJaSenJulkaisuille(projektiFromDB: DBProjekti, apiProjekti: API.Projekti) {
  const suunnitelmaJaettu = await haeSuunnitelmaJaettuTieto(projektiFromDB);
  if (!suunnitelmaJaettu) {
    return;
  }
  lisaaJakotiedotJulkaisuille(apiProjekti, projektiFromDB, suunnitelmaJaettu);
  apiProjekti.suunnitelmaJaettu = suunnitelmaJaettu;
}

async function haeSuunnitelmaJaettuTieto(projektiFromDB: DBProjekti) {
  const suunnitelmaJaettu = haeJaetunProjektinOid(projektiFromDB.projektinJakautuminen);
  return suunnitelmaJaettu ? await haeLiittyvanProjektinTiedot(suunnitelmaJaettu) : undefined;
}

async function lisaaApiAineistolleTiedostokoko(paatosAineisto: API.Aineisto[] | null | undefined): Promise<void> {
  if (!paatosAineisto) {
    return;
  }
  await Promise.all(
    paatosAineisto.map(async (aineisto) => {
      if (!aineisto.tiedosto) {
        return;
      }
      const parts = aineisto.tiedosto.split("/");
      const filenamePart = parts.pop();

      if (filenamePart) {
        const filePathWithDecodedFilename = [...parts, decodeURIComponent(filenamePart)].join("/");
        aineisto.koko = await fileService.getFileContentLength(config.yllapitoBucketName, filePathWithDecodedFilename);
      }
    })
  );
}

export async function arkistoiProjekti(oid: string): Promise<string> {
  requireAdmin();
  return await projektiArchive.archiveProjekti(oid);
}

export async function tallennaJaSiirraTilaa({ projekti, tilasiirtyma }: TallennaJaSiirraTilaaMutationVariables): Promise<string> {
  await createOrUpdateProjekti(projekti);
  await tilaHandler.siirraTila(tilasiirtyma);
  return projekti.oid;
}

export async function createOrUpdateProjekti(input: API.TallennaProjektiInput): Promise<API.TallennaProjektiResponse> {
  requirePermissionLuku();
  const oid = input.oid;
  let status: API.TallennaProjektiStatus | undefined = undefined;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiInDB) {
    // Save over existing one
    await validateTallennaProjekti(projektiInDB, input);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(input);
    const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
    await handleFilesAfterAdaptToSave(projektiAdaptationResult.projekti);
    await handleLyhytOsoite(projektiAdaptationResult.projekti, projektiInDB);
    await projektiDatabase.saveProjekti(projektiAdaptationResult.projekti);
    status = await handleEvents(projektiAdaptationResult);
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
      log.info("Sent email to projektipäällikkö", emailOptions.to);
    }
  }
  return { __typename: "TallennaProjektiResponse", status: status ?? API.TallennaProjektiStatus.OK, correlationId: getCorrelationId() };
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
      mergeWith(projektiInDB.vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.[index], tilaisuus, preventArrayMergingCustomizer)
    );
    const vuorovaikutusTilaisuusJulkaisut: VuorovaikutusTilaisuusJulkaisu[] = vuorovaikutusTilaisuudet.map(
      ({ esitettavatYhteystiedot, ...tilaisuus }) => {
        const vuorovaikutusTilaisuusJulkaisu: VuorovaikutusTilaisuusJulkaisu = {
          ...tilaisuus,
          yhteystiedot: adaptStandardiYhteystiedotInputToYhteystiedotToSave(projektiInDB, esitettavatYhteystiedot),
        };
        return vuorovaikutusTilaisuusJulkaisu;
      }
    );
    const vuorovaikutusKierros = {
      ...(projektiInDB.vuorovaikutusKierros as VuorovaikutusKierros),
      vuorovaikutusTilaisuudet,
    };
    const vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] = projektiInDB.vuorovaikutusKierrosJulkaisut ?? [];
    const affectedJulkaisu = vuorovaikutusKierrosJulkaisut.find((kierros) => kierros.id == input.vuorovaikutusNumero);
    if (!affectedJulkaisu) {
      throw new IllegalArgumentError("Ei löydy julkaisua annetulla id:llä!");
    }
    vuorovaikutusKierrosJulkaisut[vuorovaikutusKierrosJulkaisut.indexOf(affectedJulkaisu)] = {
      ...affectedJulkaisu,
      vuorovaikutusTilaisuudet: vuorovaikutusTilaisuusJulkaisut,
    };

    const tallennaProjektiInput: PartialDBProjekti = {
      oid: input.oid,
      versio: input.versio,
      vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut,
    };

    await projektiDatabase.saveProjekti(tallennaProjektiInput);
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
    requirePermissionMuokkaa(projektiInDB);
    validatePaivitaPerustiedot(projektiInDB, input);
    auditLog.info("Päivitä perustiedot", { input });
    const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult(projektiInDB);
    const vuorovaikutusKierros = adaptVuorovaikutusKierrosAfterPerustiedotUpdate(projektiInDB, input, projektiAdaptationResult);
    const vuorovaikutusKierrosJulkaisu = await asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu({
      ...projektiInDB,
      vuorovaikutusKierros,
    });
    await vuorovaikutusKierrosTilaManager.generatePDFsForJulkaisu(vuorovaikutusKierrosJulkaisu, projektiInDB);

    const vuorovaikutusKierrosJulkaisut = projektiInDB.vuorovaikutusKierrosJulkaisut;
    const oldVuorovaikutuskierrosJulkaisu = vuorovaikutusKierrosJulkaisut?.pop();
    vuorovaikutusKierrosJulkaisu.asianhallintaEventId = oldVuorovaikutuskierrosJulkaisu?.asianhallintaEventId;
    vuorovaikutusKierrosJulkaisu.ilmoituksenVastaanottajat = oldVuorovaikutuskierrosJulkaisu?.ilmoituksenVastaanottajat;
    vuorovaikutusKierrosJulkaisu.kopioituProjektista = oldVuorovaikutuskierrosJulkaisu?.kopioituProjektista;
    vuorovaikutusKierrosJulkaisut?.push(vuorovaikutusKierrosJulkaisu);

    await projektiDatabase.saveProjekti({
      oid: input.oid,
      versio: input.versio,
      vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut,
    });
    await handleEvents(projektiAdaptationResult); // Täältä voi tulla AINEISTO_CHANGED-eventtejä, jos aineistot muuttuivat.

    if (oldVuorovaikutuskierrosJulkaisu?.lahetekirje) {
      await fileService.deleteYllapitoFileFromProjekti({
        filePathInProjekti: oldVuorovaikutuskierrosJulkaisu?.lahetekirje.tiedosto,
        reason: "Vuorovaikutuskierrosjulkaisu korvattiin toisella",
        oid,
      });
    }

    return input.oid;
  } else {
    throw new IllegalArgumentError("Projektia ei ole olemassa");
  }
}

export async function createProjektiFromVelho(
  oid: string,
  vaylaUser: API.NykyinenKayttaja,
  input?: API.TallennaProjektiInput
): Promise<{
  projekti: DBProjekti;
  virhetiedot?: API.ProjektipaallikkoVirhe;
}> {
  try {
    log.info("Loading projekti from Velho", { oid });
    const projekti = await velhoClient.loadProjekti(oid);
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
      assertIsDefined(vaylaUser.uid);
      const existingCurrentUser = kayttoOikeudet.findUserByUid(vaylaUser.uid);
      if (!existingCurrentUser) {
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
    const projekti = await velhoClient.loadProjekti(oid);

    if (!projekti.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy velhosta projekti.velho-tietoa.`);
    }
    if (!projektiFromDB.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy hassusta projekti.velho-tietoa.`);
    }
    return adaptVelhoToAPI(findUpdatedFields(projektiFromDB.velho, projekti.velho));
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
    const projektiFromVelho = await velhoClient.loadProjekti(oid);
    if (!projektiFromVelho.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy velhosta projekti.velho-tietoa.`);
    }
    if (!projektiFromDB.velho) {
      throw new Error(`Projektille oid ${oid} ei löydy hassusta projekti.velho-tietoa.`);
    }

    const dbProjekti = await haeVelhoSynkronoinninMuutoksetTallennukseen(oid, projektiFromDB, projektiFromVelho.velho, reset);

    await projektiDatabase.saveProjektiWithoutLocking(dbProjekti);
    await eventSqsClient.synchronizeAineisto(oid);

    const updatedFields = findUpdatedFields(projektiFromDB.velho, projektiFromVelho.velho);
    return adaptVelhoToAPI(updatedFields);
  } catch (e) {
    log.error(e);
    throw e;
  }
}

type VelhoSynkronoinninPaivittamatKentat = Pick<DBProjekti, "oid" | "velho" | "asianhallinta" | "kayttoOikeudet">;

export async function haeVelhoSynkronoinninMuutoksetTallennukseen(
  oid: string,
  oldProjekti: DBProjekti,
  newVelho: Velho,
  reset = false
): Promise<VelhoSynkronoinninPaivittamatKentat> {
  const vastuuhenkilonEmail = newVelho.vastuuhenkilonEmail;
  const varahenkilonEmail = newVelho.varahenkilonEmail;
  const kayttoOikeudet = oldProjekti.kayttoOikeudet;

  const kayttoOikeudetManager = new KayttoOikeudetManager(
    kayttoOikeudet,
    await personSearch.getKayttajas(),
    oldProjekti.suunnitteluSopimus?.yhteysHenkilo
  );
  kayttoOikeudetManager.resetHenkilot(reset, vastuuhenkilonEmail, varahenkilonEmail);
  kayttoOikeudetManager.addProjektiPaallikkoFromEmail(vastuuhenkilonEmail);
  kayttoOikeudetManager.addVarahenkiloFromEmail(varahenkilonEmail);
  const kayttoOikeudetNew = kayttoOikeudetManager.getKayttoOikeudet();

  const asiaId = (await isProjektiAsianhallintaIntegrationEnabled(oldProjekti)) ? await haeAsiaId(oid) : undefined;

  const dbProjekti: VelhoSynkronoinninPaivittamatKentat = {
    oid,
    velho: newVelho,
    kayttoOikeudet: kayttoOikeudetNew,
    asianhallinta: { ...(oldProjekti.asianhallinta ?? {}), asiaId },
  };
  return dbProjekti;
}

async function haeAsiaId(oid: string) {
  try {
    return await asianhallintaService.getAsiaId(oid);
  } catch (e) {
    log.info(e, "asiaId:tä ei voitu hakea");
    return undefined;
  }
}

async function handleSuunnitteluSopimusFile(input: API.TallennaProjektiInput) {
  if (input.suunnitteluSopimus?.logo?.SUOMI) {
    input.suunnitteluSopimus.logo.SUOMI = await fileService.persistFileToProjekti({
      uploadedFileSource: input.suunnitteluSopimus.logo.SUOMI,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
    if (!input.suunnitteluSopimus.logo.SUOMI) {
      throw new NotFoundError("Logoa ei löydy");
    }
  }

  if (input.suunnitteluSopimus?.logo?.RUOTSI) {
    input.suunnitteluSopimus.logo.RUOTSI = await fileService.persistFileToProjekti({
      uploadedFileSource: input.suunnitteluSopimus.logo.RUOTSI,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
    if (!input.suunnitteluSopimus.logo.RUOTSI) {
      throw new NotFoundError("Logoa ei löydy");
    }
  }
}

async function persistFiles<T extends Record<string, LadattuTiedosto | null>, K extends keyof T>(
  oid: string,
  container: T | undefined,
  path: PathTuple,
  keys: K[],
  asiakirjaTyypit: API.AsiakirjaTyyppi[],
  kielet: API.Kieli[]
): Promise<T | undefined> {
  if (!container) {
    return container;
  }
  const palautus: any = Object.assign({}, container);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const ladattuTiedosto = container[key];
    switch (ladattuTiedosto?.tila) {
      case API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA:
        palautus[key] = await persistLadattuTiedosto({
          oid,
          ladattuTiedosto,
          targetFilePathInProjekti: path.yllapitoPath,
          asiakirjaTyyppi: asiakirjaTyypit[i],
          kieli: kielet[i],
        });
        if (!palautus[key]) {
          throw new NotFoundError("Tiedostoa ei löydy");
        }
        break;
      case API.LadattuTiedostoTila.ODOTTAA_POISTOA:
        await deleteFile({
          oid,
          tiedosto: ladattuTiedosto,
        });
        palautus[key] = null;
        break;
      default:
        palautus[key] = ladattuTiedosto;
        break;
    }
  }
  return palautus as T;
}

async function handleAloituskuulutusSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const aloitusKuulutus = dbProjekti.aloitusKuulutus;
    const saamePDFt = aloitusKuulutus?.aloituskuulutusSaamePDFt?.[kieli];
    if (saamePDFt) {
      assertIsDefined(
        dbProjekti.aloitusKuulutus?.aloituskuulutusSaamePDFt,
        "dbProjekti.aloitusKuulutus.aloituskuulutusSaamePDFt on määritelty varmasti"
      );
      dbProjekti.aloitusKuulutus.aloituskuulutusSaamePDFt[kieli] = await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).aloituskuulutus(aloitusKuulutus),
        ["kuulutusPDF", "kuulutusIlmoitusPDF"],
        [API.AsiakirjaTyyppi.ALOITUSKUULUTUS, API.AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA],
        [API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME]
      );
    }
  });
}

async function handleVuorovaikutusSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const vuorovaikutusKierros = dbProjekti.vuorovaikutusKierros;
    const kutsuPDFLadattuTiedosto = vuorovaikutusKierros?.vuorovaikutusSaamePDFt?.[kieli];
    if (kutsuPDFLadattuTiedosto) {
      assertIsDefined(
        dbProjekti?.vuorovaikutusKierros?.vuorovaikutusSaamePDFt,
        "dbProjekti.vuorovaikutusKierros.vuorovaikutusSaamePDFt on varmasti määritelty"
      );
      switch (kutsuPDFLadattuTiedosto.tila) {
        case API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA:
          dbProjekti.vuorovaikutusKierros.vuorovaikutusSaamePDFt[kieli] = await persistLadattuTiedosto({
            oid: dbProjekti.oid,
            ladattuTiedosto: kutsuPDFLadattuTiedosto,
            targetFilePathInProjekti: new ProjektiPaths(dbProjekti.oid).vuorovaikutus(vuorovaikutusKierros).yllapitoPath,
            asiakirjaTyyppi: API.AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
            kieli: API.Kieli.POHJOISSAAME,
          });
          if (!dbProjekti.vuorovaikutusKierros.vuorovaikutusSaamePDFt[kieli]) {
            throw new NotFoundError("Tiedostoa ei löydy");
          }
          break;
        case API.LadattuTiedostoTila.ODOTTAA_POISTOA:
          await deleteFile({
            oid: dbProjekti.oid,
            tiedosto: kutsuPDFLadattuTiedosto,
          });
          dbProjekti.vuorovaikutusKierros.vuorovaikutusSaamePDFt[kieli] = null;
          break;
        default:
          break;
      }
    }
  });
}

async function handleNahtavillaoloSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const nahtavillaoloVaihe = dbProjekti.nahtavillaoloVaihe;
    const saamePDFt = nahtavillaoloVaihe?.nahtavillaoloSaamePDFt?.[kieli];
    if (saamePDFt) {
      assertIsDefined(
        dbProjekti?.nahtavillaoloVaihe?.nahtavillaoloSaamePDFt,
        "dbProjekti.nahtavillaoloVaihe?.nahtavillaoloSaamePDFt on määritelty varmasti"
      );
      dbProjekti.nahtavillaoloVaihe.nahtavillaoloSaamePDFt[kieli] = await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
        ["kuulutusPDF", "kuulutusIlmoitusPDF", "kirjeTiedotettavillePDF"],
        [
          API.AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
          API.AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
          API.AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
        ],
        [API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME]
      );
    }
  });
}

async function handleHyvaksymisPaatosSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const hyvaksymisPaatosVaihe = dbProjekti.hyvaksymisPaatosVaihe;
    const saamePDFt = hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      assertIsDefined(
        dbProjekti?.hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt,
        "dbProjekti.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt on määritelty varmasti"
      );
      dbProjekti.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt[kieli] = await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe),
        ["kuulutusPDF", "kuulutusIlmoitusPDF", "kirjeTiedotettavillePDF"],
        [
          API.AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
          API.AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
          API.AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
        ],
        [API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME]
      );
    }
  });
}

async function handleJatkopaatos1SaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const jatkoPaatos1Vaihe = dbProjekti.jatkoPaatos1Vaihe;
    const saamePDFt = jatkoPaatos1Vaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      assertIsDefined(
        dbProjekti?.jatkoPaatos1Vaihe?.hyvaksymisPaatosVaiheSaamePDFt,
        "dbProjekti.jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt on määritelty varmasti"
      );
      dbProjekti.jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt[kieli] = await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(jatkoPaatos1Vaihe),
        ["kuulutusPDF", "kuulutusIlmoitusPDF"],
        [
          API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS,
          API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
        ],
        [API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME]
      );
    }
  });
}

async function handleJatkopaatos2SaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const jatkoPaatos2Vaihe = dbProjekti.jatkoPaatos2Vaihe;
    const saamePDFt = jatkoPaatos2Vaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      assertIsDefined(
        dbProjekti?.jatkoPaatos2Vaihe?.hyvaksymisPaatosVaiheSaamePDFt,
        "dbProjekti.jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt on määritelty varmasti"
      );
      dbProjekti.jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt[kieli] = await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(jatkoPaatos2Vaihe),
        ["kuulutusPDF", "kuulutusIlmoitusPDF"],
        [
          API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2,
          API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
        ],
        [API.Kieli.POHJOISSAAME, API.Kieli.POHJOISSAAME]
      );
    }
  });
}

async function handleEuLogoFiles(input: API.TallennaProjektiInput) {
  if (input.euRahoitusLogot?.SUOMI) {
    input.euRahoitusLogot.SUOMI = await fileService.persistFileToProjekti({
      uploadedFileSource: input.euRahoitusLogot.SUOMI,
      oid: input.oid,
      targetFilePathInProjekti: "euLogot/FI",
    });
    if (!input.euRahoitusLogot.SUOMI) {
      throw new NotFoundError("Logoa ei löydy");
    }
  }

  if (input.euRahoitusLogot?.RUOTSI) {
    input.euRahoitusLogot.RUOTSI = await fileService.persistFileToProjekti({
      uploadedFileSource: input.euRahoitusLogot.RUOTSI,
      oid: input.oid,
      targetFilePathInProjekti: "euLogot/SV",
    });
    if (!input.euRahoitusLogot.RUOTSI) {
      throw new NotFoundError("Logoa ei löydy");
    }
  }
}

/**
 * If there are uploaded files in the input, persist them into the project
 */
async function handleFiles(input: API.TallennaProjektiInput) {
  await handleSuunnitteluSopimusFile(input);
  await handleEuLogoFiles(input);
}

async function handleFilesAfterAdaptToSave(dbProjekti: DBProjekti) {
  await handleAloituskuulutusSaamePDF(dbProjekti);
  await handleVuorovaikutusSaamePDF(dbProjekti);
  await handleNahtavillaoloSaamePDF(dbProjekti);
  await handleHyvaksymisPaatosSaamePDF(dbProjekti);
  await handleJatkopaatos1SaamePDF(dbProjekti);
  await handleJatkopaatos2SaamePDF(dbProjekti);
}

async function saveProjektiToVelho(projekti: DBProjekti) {
  const kasittelynTila = projekti.kasittelynTila;
  if (kasittelynTila) {
    const { hyvaksymispaatos: _inputHyvaksymispaatos, ...inputAdminOikeudetVaativatKentat } = kasittelynTila;
    if (!isEmpty(inputAdminOikeudetVaativatKentat)) {
      requireOmistaja(projekti, "Käsittelyn tilaa voi muokata vain projektipäällikkö");
    } else {
      requireAdmin("Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja");
    }
    await velhoClient.saveKasittelynTila(projekti.oid, kasittelynTila);
  }
}

export async function handleEvents(projektiAdaptationResult: ProjektiAdaptationResult): Promise<API.TallennaProjektiStatus | undefined> {
  let status: API.TallennaProjektiStatus | undefined = undefined;

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) => events.some((event) => event.eventType === ProjektiEventType.SAVE_PROJEKTI_TO_VELHO),
    async () => {
      try {
        await saveProjektiToVelho(projektiAdaptationResult.projekti);
      } catch {
        status = API.TallennaProjektiStatus.VELHO_TALLENNUS_ERROR;
      }
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) => events.some((event) => event.eventType === ProjektiEventType.RESET_KAYTTOOIKEUDET),
    async (oid) => {
      await synchronizeUpdatesFromVelho(oid, true);
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) =>
      events.some((event) => event.eventType === ProjektiEventType.FILES_CHANGED) &&
      events.some((event) => event.eventType === ProjektiEventType.AINEISTO_CHANGED),
    async (oid) => {
      return await eventSqsClient.handleChangedAineistotAndTiedostot(oid);
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) =>
      events.some((event) => event.eventType === ProjektiEventType.AINEISTO_CHANGED) &&
      !events.some((event) => event.eventType === ProjektiEventType.FILES_CHANGED),
    async (oid) => {
      return await eventSqsClient.handleChangedAineisto(oid);
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) =>
      events.some((event) => event.eventType === ProjektiEventType.FILES_CHANGED) &&
      !events.some((event) => event.eventType === ProjektiEventType.AINEISTO_CHANGED),
    async (oid) => {
      return await eventSqsClient.handleChangedTiedostot(oid);
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) => events.some((event) => event.eventType === ProjektiEventType.ZIP_LAUSUNTOPYYNNOT),
    async (oid) => {
      return await eventSqsClient.zipLausuntoPyyntoAineisto(oid);
    }
  );

  await projektiAdaptationResult.onEvents(
    (events: ProjektiEvent[]) => events.some((event) => event.eventType === ProjektiEventType.LOGO_FILES_CHANGED),
    async (oid) => {
      return await eventSqsClient.synchronizeAineisto(oid);
    }
  );

  return status;
}

async function handleLyhytOsoite(dbProjektiToSave: DBProjekti, projektiInDB: DBProjekti) {
  if (!projektiInDB.lyhytOsoite) {
    dbProjektiToSave.lyhytOsoite = await lyhytOsoiteDatabase.generateAndSetLyhytOsoite(projektiInDB.oid);
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
