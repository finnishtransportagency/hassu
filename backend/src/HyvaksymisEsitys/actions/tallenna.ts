import * as API from "hassu-common/graphql/apiModel";
import { auditLog } from "../../logger";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import { AineistoNew } from "../../database/model";
import getHyvaksymisEsityksenAineistot, { getHyvaksymisEsityksenPoistetutAineistot } from "../getAineistot";
import { getHyvaksymisEsityksenPoistetutTiedostot, getHyvaksymisEsityksenUudetLadatutTiedostot } from "../getLadatutTiedostot";
import { persistFile } from "../s3Calls/persistFile";
import { MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "../../tiedostot/paths";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { assertIsDefined } from "../../util/assertions";
import projektiDatabase, { HyvaksymisEsityksenTiedot } from "../dynamoKutsut";
import { hyvaksymisEsitysSchema, HyvaksymisEsitysValidationContext } from "hassu-common/schema/hyvaksymisEsitysSchema";
import { ValidationMode } from "hassu-common/ProjektiValidationContext";
import { SqsClient } from "../aineistoHandling/sqsClient";
import { HyvaksymisEsitysAineistoOperation } from "../aineistoHandling/sqsEvent";
import { validateVaiheOnAktiivinen } from "../validateVaiheOnAktiivinen";
import { TestType } from "hassu-common/schema/common";

/**
 * Hakee halutun projektin tiedot ja tallentaa inputin perusteella muokattavalle hyväksymisesitykselle uudet tiedot.
 * Persistoi inputissa tulleet uudet ladatut tiedostot ja poistaa poistetut aineistot/tiedostot.
 * Luo tapahtumia SQS-jonoon, jos inputissa on uusia aineistoja.
 *
 * @param input input
 * @param input.oid Projektin oid
 * @param input.versio Projektin oletettu versio
 * @param input.muokattavaHyvaksymisEsitys Halutut uudet tiedot muokattavalle hyväksymisesitykselle
 * @returns Projektin oid
 */
export default async function tallennaHyvaksymisEsitys(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  const nykyinenKayttaja = requirePermissionLuku();
  const { oid, versio, muokattavaHyvaksymisEsitys } = input;
  try {
    await projektiDatabase.setLock(oid);
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projektiInDB, "projekti pitää olla olemassa");
    await validate(projektiInDB, input);
    // Adaptoi muokattava hyvaksymisesitys
    const newMuokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(projektiInDB.muokattavaHyvaksymisEsitys, muokattavaHyvaksymisEsitys);
    // Persistoi uudet tiedostot
    const uudetTiedostot = getHyvaksymisEsityksenUudetLadatutTiedostot(projektiInDB.muokattavaHyvaksymisEsitys, muokattavaHyvaksymisEsitys);
    if (uudetTiedostot.length) {
      await Promise.all(
        uudetTiedostot.map((ladattuTiedosto) => persistFile({ oid, ladattuTiedosto, vaihePrefix: MUOKATTAVA_HYVAKSYMISESITYS_PATH }))
      );
    }
    // Poista poistetut tiedostot/aineistot
    const poistetutTiedostot = getHyvaksymisEsityksenPoistetutTiedostot(
      projektiInDB.muokattavaHyvaksymisEsitys,
      newMuokattavaHyvaksymisEsitys
    );
    const poistetutAineistot = getHyvaksymisEsityksenPoistetutAineistot(
      projektiInDB.muokattavaHyvaksymisEsitys,
      newMuokattavaHyvaksymisEsitys
    );
    if (poistetutTiedostot.length || poistetutAineistot.length) {
      await deleteFilesUnderSpecifiedVaihe(oid, MUOKATTAVA_HYVAKSYMISESITYS_PATH, [...poistetutTiedostot, ...poistetutAineistot]);
    }
    // Tallenna adaptoitu hyväksymisesitys tietokantaan
    auditLog.info("Tallenna hyväksymisesitys", { oid, versio, newMuokattavaHyvaksymisEsitys });
    assertIsDefined(nykyinenKayttaja.uid, "Nykyisellä käyttäjällä on oltava uid");
    await projektiDatabase.tallennaMuokattavaHyvaksymisEsitys({
      oid,
      versio,
      muokattavaHyvaksymisEsitys: newMuokattavaHyvaksymisEsitys,
      muokkaaja: nykyinenKayttaja.uid,
    });
    if (
      uusiaAineistoja(
        getHyvaksymisEsityksenAineistot(projektiInDB.muokattavaHyvaksymisEsitys),
        getHyvaksymisEsityksenAineistot(newMuokattavaHyvaksymisEsitys)
      )
    ) {
      await SqsClient.addEventToSqsQueue({ operation: HyvaksymisEsitysAineistoOperation.TUO_HYV_ES_TIEDOSTOT, oid });
    }
    return oid;
  } finally {
    await projektiDatabase.releaseLock(oid);
  }
}

async function validate(projektiInDB: HyvaksymisEsityksenTiedot, input: API.TallennaHyvaksymisEsitysInput) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys tai
  // ei muokattavaa hyväksymisesitystä
  if (projektiInDB.muokattavaHyvaksymisEsitys && projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla tulee olla muokkaustilainen hyväksymisesitys tai ei vielä lainkaan hyväksymisesitystä");
  }
  if (input.versio !== projektiInDB.versio) {
    throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
  }
  const context: HyvaksymisEsitysValidationContext = { validationMode: { current: ValidationMode.DRAFT }, testType: TestType.BACKEND };
  hyvaksymisEsitysSchema.validateSync(input, {
    context,
  });
  await validateVaiheOnAktiivinen(projektiInDB);
}

function uusiaAineistoja(aineistotBefore: AineistoNew[], aineistotAfter: AineistoNew[]): boolean {
  return aineistotAfter.some(({ uuid }) => !aineistotBefore.some(({ uuid: uuidBefore }) => uuidBefore == uuid));
}
