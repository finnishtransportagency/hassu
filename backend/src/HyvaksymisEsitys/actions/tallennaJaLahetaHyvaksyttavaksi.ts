import * as API from "hassu-common/graphql/apiModel";
import { MuokattavaHyvaksymisEsitys } from "../../database/model";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { hyvaksymisEsitysSchema, TestType, HyvaksymisEsitysValidationContext } from "hassu-common/schema/hyvaksymisEsitysSchema";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import { auditLog, log } from "../../logger";
import getHyvaksymisEsityksenAineistot, { getHyvaksymisEsityksenPoistetutAineistot } from "../getAineistot";
import { getHyvaksymisEsityksenPoistetutTiedostot, getHyvaksymisEsityksenUudetLadatutTiedostot } from "../getLadatutTiedostot";
import { persistFile } from "../s3Calls/persistFile";
import { MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "../../tiedostot/paths";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { assertIsDefined } from "../../util/assertions";
import projektiDatabase, { HyvaksymisEsityksenTiedot } from "../dynamoKutsut";
import { createHyvaksymisesitysHyvaksyttavanaEmail } from "../../email/emailTemplates";
import { emailClient } from "../../email/email";
import { ValidationMode } from "hassu-common/ProjektiValidationContext";

/**
 * Hakee halutun projektin tiedot ja tallentaa inputin perusteella muokattavalle hyväksymisesitykselle uudet tiedot
 * ja asettaa sen odottaa hyväksyntää -tilaan.
 * Persistoi inputissa tulleet uudet ladatut tiedostot ja poistaa poistetut aineistot/tiedostot.
 *
 * @param input input
 * @param input.oid Projektin oid
 * @param input.versio Projektin oletettu versio
 * @param input.muokattavaHyvaksymisEsitys Halutut uudet tiedot muokattavalle hyväksymisesitykselle
 * @returns Projektin oid
 */
export default async function tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  const kayttaja = requirePermissionLuku();
  const { oid, versio, muokattavaHyvaksymisEsitys } = input;

  const projektiInDB = await projektiDatabase.haeProjektinTiedotHyvaksymisEsityksesta(oid);
  // Validoi ennen adaptointia
  validateCurrent(projektiInDB, input);
  // Adaptoi muokattava hyvaksymisesitys
  const newMuokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(projektiInDB.muokattavaHyvaksymisEsitys, muokattavaHyvaksymisEsitys);
  // Validoi, että hyväksyttäväksi lähetettävällä hyväksymisEsityksellä on kaikki kentät kunnossa
  validateUpcoming(newMuokattavaHyvaksymisEsitys, projektiInDB.aineistoHandledAt);
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
  // Tallenna adaptaation tulos "odottaa hyväksyntää" tilalla varustettuna tietokantaan
  const tallennettavaMuokattavaHyvaksymisEsitys = {
    ...newMuokattavaHyvaksymisEsitys,
    tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
  };
  auditLog.info("Tallenna hyväksymisesitys", { oid, versio, tallennettavaMuokattavaHyvaksymisEsitys });
  assertIsDefined(kayttaja.uid, "Kayttaja.uid oltava määritelty");
  await projektiDatabase.tallennaMuokattavaHyvaksymisEsitys({
    oid,
    versio,
    muokattavaHyvaksymisEsitys: tallennettavaMuokattavaHyvaksymisEsitys,
    muokkaaja: kayttaja.uid,
  });
  // Aineistomuutoksia ei voi olla, koska validoimme, että tiedostot ovat valmiita

  // Lähetä email
  const emailOptions = createHyvaksymisesitysHyvaksyttavanaEmail(projektiInDB);
  if (emailOptions.to) {
    await emailClient.sendEmail(emailOptions);
  } else {
    log.error("Ilmoitukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
  return oid;
}

function validateCurrent(projektiInDB: HyvaksymisEsityksenTiedot, input: API.TallennaHyvaksymisEsitysInput) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla ei ole muokkaustilaista hyväksymisesitystä");
  }
  if (input.versio !== projektiInDB.versio) {
    throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
  }
}

function validateUpcoming(muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys, aineistotHandledAt: string | undefined | null) {
  const context: HyvaksymisEsitysValidationContext = { validationMode: { current: ValidationMode.PUBLISH }, testType: TestType.BACKEND };
  hyvaksymisEsitysSchema.validateSync(muokattavaHyvaksymisEsitys, {
    context,
  });
  // Aineistojen ja ladattujen tiedostojen on oltava valmiita
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  if (!aineistotHandledAt || !aineistot.every((aineisto) => aineistotHandledAt.localeCompare(aineisto.lisatty) > 0)) {
    throw new IllegalArgumentError("Aineistojen on oltava valmiita ennen kuin hyväksymisesitys lähetetään hyväksyttäväksi.");
  }
}
