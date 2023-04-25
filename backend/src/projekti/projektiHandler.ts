import { projektiDatabase } from "../database/projektiDatabase";
import { requireAdmin, requirePermissionLuku, requirePermissionLuonti, requirePermissionMuokkaa, requireVaylaUser } from "../user";
import { velho as velhoClient } from "../velho/velhoClient";
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
import { findUpdatedFields } from "../velho/velhoAdapter";
import {
  DBProjekti,
  IlmoituksenVastaanottajat,
  LadattuTiedosto,
  PartialDBProjekti,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuus,
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import { aineistoService } from "../aineisto/aineistoService";
import { ProjektiAdaptationResult, ProjektiEventType } from "./adapter/projektiAdaptationResult";
import { validatePaivitaPerustiedot, validatePaivitaVuorovaikutus, validateTallennaProjekti } from "./projektiValidator";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import {
  adaptStandardiYhteystiedotInputToYhteystiedotToSave,
  adaptVuorovaikutusKierrosAfterPerustiedotUpdate,
  forEverySaameDoAsync,
} from "./adapter/adaptToDB";
import { asiakirjaAdapter } from "../handler/asiakirjaAdapter";
import { vuorovaikutusKierrosTilaManager } from "../handler/tila/vuorovaikutusKierrosTilaManager";
import { ProjektiAineistoManager } from "../aineisto/projektiAineistoManager";
import { assertIsDefined } from "../util/assertions";
import isArray from "lodash/isArray";
import { lyhytOsoiteDatabase } from "../database/lyhytOsoiteDatabase";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { localDateTimeString } from "../util/dateUtil";

export async function projektinTila(oid: string): Promise<API.ProjektinTila> {
  const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
  if (projektiFromDB) {
    const aineistoManager = new ProjektiAineistoManager(projektiFromDB);
    return { __typename: "ProjektinTila", aineistotValmiit: aineistoManager.isReady() };
  } else {
    throw new NotFoundError("Projektia ei löydy: " + oid);
  }
}

export async function loadProjektiYllapito(oid: string): Promise<API.Projekti> {
  const vaylaUser = requirePermissionLuku();
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
    await validateTallennaProjekti(projektiInDB, input);
    auditLog.info("Tallenna projekti", { input });
    await handleFiles(input);
    const projektiAdaptationResult = await projektiAdapter.adaptProjektiToSave(projektiInDB, input);
    await handleFilesAfterAdaptToSave(projektiAdaptationResult.projekti);
    await handleLyhytOsoite(projektiAdaptationResult.projekti, projektiInDB);
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
      mergeWith(
        projektiInDB.vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.[index],
        tilaisuus,
        function preventArrayMergingCustomizer(objValue, srcValue) {
          if (isArray(objValue) && isArray(srcValue)) {
            return srcValue;
          }
        }
      )
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
    const vuorovaikutusKierrosJulkaisut: VuorovaikutusKierrosJulkaisu[] = projektiInDB.vuorovaikutusKierrosJulkaisut || [];
    vuorovaikutusKierrosJulkaisut[input.vuorovaikutusNumero - 1] = {
      ...vuorovaikutusKierrosJulkaisut[input.vuorovaikutusNumero - 1],
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
    return adaptVelho(findUpdatedFields(projektiFromDB.velho, projekti.velho));
  } catch (e) {
    log.error(e);
    throw e;
  }
}

type PartialProjektiWithLuonnosVaiheet = Pick<
  DBProjekti,
  "aloitusKuulutus" | "vuorovaikutusKierros" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

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

    const vastuuhenkilonEmail = projektiFromVelho.velho.vastuuhenkilonEmail;
    const varahenkilonEmail = projektiFromVelho.velho.varahenkilonEmail;
    const kayttoOikeudet = projektiFromDB.kayttoOikeudet;

    const kayttoOikeudetManager = new KayttoOikeudetManager(
      kayttoOikeudet,
      await personSearch.getKayttajas(),
      projektiFromDB.suunnitteluSopimus?.yhteysHenkilo
    );
    kayttoOikeudetManager.resetHenkilot(reset, vastuuhenkilonEmail, varahenkilonEmail);
    kayttoOikeudetManager.addProjektiPaallikkoFromEmail(vastuuhenkilonEmail);
    kayttoOikeudetManager.addVarahenkiloFromEmail(varahenkilonEmail);
    const kayttoOikeudetNew = kayttoOikeudetManager.getKayttoOikeudet();

    const updatedFields = findUpdatedFields(projektiFromDB.velho, projektiFromVelho.velho);

    const projektiAvaimetJoissaIlmoitetuksenVastaanottajat = getUpdatedIlmoituksenVastaanottajat(projektiFromDB, projektiFromVelho.velho);

    const dbProjekti: Pick<DBProjekti, "oid" | "velho" | "kayttoOikeudet"> = {
      oid,
      velho: projektiFromVelho.velho,
      kayttoOikeudet: kayttoOikeudetNew,
      ...projektiAvaimetJoissaIlmoitetuksenVastaanottajat,
    };

    await projektiDatabase.saveProjektiWithoutLocking(dbProjekti);
    return adaptVelho(updatedFields);
  } catch (e) {
    log.error(e);
    throw e;
  }
}

function getUpdatedIlmoituksenVastaanottajat(dbProjekti: DBProjekti, velho: Velho): PartialProjektiWithLuonnosVaiheet {
  const luonnosVaiheKeys: (keyof PartialProjektiWithLuonnosVaiheet)[] = [
    "aloitusKuulutus",
    "vuorovaikutusKierros",
    "nahtavillaoloVaihe",
    "hyvaksymisPaatosVaihe",
    "jatkoPaatos1Vaihe",
    "jatkoPaatos2Vaihe",
  ];

  return luonnosVaiheKeys.reduce<PartialProjektiWithLuonnosVaiheet>((dataToSave, vaiheKey) => {
    if (dbProjekti[vaiheKey]) {
      if (vaiheKey === "vuorovaikutusKierros") {
        const oldVuorovaikutusKierros = dbProjekti[vaiheKey];
        const vuorovaikutusNumero = oldVuorovaikutusKierros?.vuorovaikutusNumero;
        if (!oldVuorovaikutusKierros || vuorovaikutusNumero === undefined) {
          throw new Error("Vuorovaikutuskierrokselta puuttuu vuorovaikutusnumero");
        }
        const viranomaiset = oldVuorovaikutusKierros.ilmoituksenVastaanottajat?.viranomaiset || [];
        dataToSave[vaiheKey] = {
          ...oldVuorovaikutusKierros,
          vuorovaikutusNumero,
          ilmoituksenVastaanottajat: { kunnat: getUpdatedKunnat(dbProjekti, velho, vaiheKey), viranomaiset },
        };
      } else {
        const oldVaiheData = dbProjekti[vaiheKey];
        const id = oldVaiheData?.id;
        if (!oldVaiheData || id === undefined) {
          throw new Error(`'${vaiheKey}' vaiheelta puuttuu id-tieto`);
        }
        const viranomaiset = oldVaiheData.ilmoituksenVastaanottajat?.viranomaiset || [];
        dataToSave[vaiheKey] = {
          ...oldVaiheData,
          id,
          ilmoituksenVastaanottajat: { kunnat: getUpdatedKunnat(dbProjekti, velho, vaiheKey), viranomaiset },
        };
      }
    }
    return dataToSave;
  }, {});
}

function getUpdatedKunnat(dbProjekti: DBProjekti, velho: Velho, vaiheKey: keyof PartialProjektiWithLuonnosVaiheet) {
  const defaultKunnat: IlmoituksenVastaanottajat["kunnat"] = velho.kunnat?.map((id) => ({ id, sahkoposti: "" }));

  const vanhatKuntatiedot = dbProjekti[vaiheKey]?.ilmoituksenVastaanottajat?.kunnat;
  const kunnat: IlmoituksenVastaanottajat["kunnat"] = defaultKunnat?.map((defaultKunta) => {
    const vanhaKuntatieto = vanhatKuntatiedot?.find((kunta) => kunta.id === defaultKunta.id);
    return {
      ...(vanhaKuntatieto || {}),
      id: defaultKunta.id,
      sahkoposti: vanhaKuntatieto?.sahkoposti || defaultKunta.sahkoposti,
    };
  });
  return kunnat;
}

async function handleSuunnitteluSopimusFile(input: API.TallennaProjektiInput) {
  const logo = input.suunnitteluSopimus?.logo;
  if (logo && input.suunnitteluSopimus) {
    input.suunnitteluSopimus.logo = await fileService.persistFileToProjekti({
      uploadedFileSource: logo,
      oid: input.oid,
      targetFilePathInProjekti: "suunnittelusopimus",
    });
  }
}

async function persistLadattuTiedosto(oid: string, ladattuTiedosto: LadattuTiedosto, targetFilePathInProjekti: string) {
  if (ladattuTiedosto) {
    if (!ladattuTiedosto.tuotu) {
      const uploadedFile: string = await fileService.persistFileToProjekti({
        uploadedFileSource: ladattuTiedosto.tiedosto,
        oid,
        targetFilePathInProjekti,
      });

      const fileName = uploadedFile.split("/").pop();
      assertIsDefined(fileName, "tiedostonimi pitäisi löytyä aina");
      ladattuTiedosto.tiedosto = uploadedFile;
      ladattuTiedosto.nimi = fileName;
      ladattuTiedosto.tuotu = localDateTimeString();
    } else if (ladattuTiedosto.nimi == null) {
      // Deletoi tiedosto
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: ladattuTiedosto.tiedosto,
        reason: "Käyttäjä poisti tiedoston",
      });
    }
  }
}

async function persistFiles<T extends Record<string, LadattuTiedosto | null>, K extends keyof T>(
  oid: string,
  container: T | undefined | null,
  path: PathTuple,
  ...keys: K[]
): Promise<void> {
  if (!container) {
    return;
  }
  for (const key of keys) {
    const ladattuTiedosto = container[key];
    if (ladattuTiedosto) {
      await persistLadattuTiedosto(oid, ladattuTiedosto, path.yllapitoPath);
    }
  }
}

async function handleAloituskuulutusSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const aloitusKuulutus = dbProjekti.aloitusKuulutus;
    const saamePDFt = aloitusKuulutus?.aloituskuulutusSaamePDFt?.[kieli];
    if (saamePDFt) {
      await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).aloituskuulutus(aloitusKuulutus),
        "kuulutusPDF",
        "kuulutusIlmoitusPDF"
      );
    }
  });
}

async function handleVuorovaikutusSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const vuorovaikutusKierros = dbProjekti.vuorovaikutusKierros;
    const kutsuPDFLadattuTiedosto = vuorovaikutusKierros?.vuorovaikutusSaamePDFt?.[kieli];
    if (kutsuPDFLadattuTiedosto) {
      await persistLadattuTiedosto(
        dbProjekti.oid,
        kutsuPDFLadattuTiedosto,
        new ProjektiPaths(dbProjekti.oid).vuorovaikutus(vuorovaikutusKierros).yllapitoPath
      );
    }
  });
}

async function handleNahtavillaoloSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const nahtavillaoloVaihe = dbProjekti.nahtavillaoloVaihe;
    const saamePDFt = nahtavillaoloVaihe?.nahtavillaoloSaamePDFt?.[kieli];
    if (saamePDFt) {
      await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
        "kuulutusPDF",
        "kuulutusIlmoitusPDF"
      );
    }
  });
}

async function handleHyvaksymisPaatosSaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const hyvaksymisPaatosVaihe = dbProjekti.hyvaksymisPaatosVaihe;
    const saamePDFt = hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe),
        "kuulutusPDF",
        "kuulutusIlmoitusPDF"
      );
    }
  });
}

async function handleJatkopaatos1SaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const jatkoPaatos1Vaihe = dbProjekti.jatkoPaatos1Vaihe;
    const saamePDFt = jatkoPaatos1Vaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(jatkoPaatos1Vaihe),
        "kuulutusPDF",
        "kuulutusIlmoitusPDF"
      );
    }
  });
}

async function handleJatkopaatos2SaamePDF(dbProjekti: DBProjekti) {
  await forEverySaameDoAsync(async (kieli) => {
    const jatkoPaatos2Vaihe = dbProjekti.jatkoPaatos2Vaihe;
    const saamePDFt = jatkoPaatos2Vaihe?.hyvaksymisPaatosVaiheSaamePDFt?.[kieli];
    if (saamePDFt) {
      await persistFiles(
        dbProjekti.oid,
        saamePDFt,
        new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(jatkoPaatos2Vaihe),
        "kuulutusPDF",
        "kuulutusIlmoitusPDF"
      );
    }
  });
}

async function handleEuLogoFiles(input: API.TallennaProjektiInput) {
  const logoFI = input.euRahoitusLogot?.logoFI;
  if (logoFI && input.euRahoitusLogot) {
    input.euRahoitusLogot.logoFI = await fileService.persistFileToProjekti({
      uploadedFileSource: logoFI,
      oid: input.oid,
      targetFilePathInProjekti: "euLogot/FI",
    });
  }

  const logoSV = input.euRahoitusLogot?.logoSV;
  if (logoSV && input.euRahoitusLogot) {
    input.euRahoitusLogot.logoSV = await fileService.persistFileToProjekti({
      uploadedFileSource: logoSV,
      oid: input.oid,
      targetFilePathInProjekti: "euLogot/SV",
    });
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
    await velhoClient.saveProjekti(projekti.oid, kasittelynTila);
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

async function handleLyhytOsoite(dbProjektiToSave: DBProjekti, projektiInDB: DBProjekti) {
  if (!projektiInDB.lyhytOsoite) {
    dbProjektiToSave.lyhytOsoite = await lyhytOsoiteDatabase.generateAndSetLyhytOsoite(projektiInDB.oid);
  }
}
