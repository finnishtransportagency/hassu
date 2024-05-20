import * as API from "hassu-common/graphql/apiModel";
import { MuokattavaHyvaksymisEsitys } from "../../database/model";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import { auditLog } from "../../logger";
import { tallennaMuokattavaHyvaksymisEsitys } from "../dynamoDBCalls";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "../dynamoDBCalls/getHyvaksymisEsityksenTiedot";
import getHyvaksymisEsityksenAineistot, { getHyvaksymisEsityksenPoistetutAineistot } from "../getAineistot";
import { getHyvaksymisEsityksenPoistetutTiedostot, getHyvaksymisEsityksenUudetLadatutTiedostot } from "../getLadatutTiedostot";
import { persistFile } from "../s3Calls/persistFile";
import { MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "../../tiedostot/paths";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { assertIsDefined } from "../../util/assertions";

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

  const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
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
  await tallennaMuokattavaHyvaksymisEsitys({
    oid,
    versio,
    muokattavaHyvaksymisEsitys: tallennettavaMuokattavaHyvaksymisEsitys,
    muokkaaja: kayttaja.uid,
  });
  // Aineistomuutoksia ei voi olla, koska validoimme, että tiedostot ovat valmiita
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
  // Validoi, että kaikki kentät on täytetty (poistumisPaivan olemassaolo varmistetaan tallennuksessa)
  if (!muokattavaHyvaksymisEsitys.laskutustiedot) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole laskutustietoja");
  }
  if (!muokattavaHyvaksymisEsitys.hyvaksymisEsitys?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole hyväksymisesitys-tiedostoa");
  }
  if (!muokattavaHyvaksymisEsitys.suunnitelma?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole suunnitelmaa");
  }
  if (!muokattavaHyvaksymisEsitys.muistutukset?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole muistutuksia");
  }
  if (!muokattavaHyvaksymisEsitys.lausunnot?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole lausuntoja");
  }
  if (!muokattavaHyvaksymisEsitys.maanomistajaluettelo?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole maanomistajaluetteloa");
  }
  if (!muokattavaHyvaksymisEsitys.kuulutuksetJaKutsu?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole kuulutuksia ja kutsua");
  }
  if (!muokattavaHyvaksymisEsitys.vastaanottajat?.length) {
    throw new IllegalArgumentError("Hyväksymisesityksellä ei ole vastaanottajia");
  }
  // Aineistojen ja ladattujen tiedostojen on oltava valmiita
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  if (!aineistotHandledAt || !aineistot.every((aineisto) => aineistotHandledAt.localeCompare(aineisto.lisatty) > 0)) {
    throw new IllegalArgumentError("Aineistojen on oltava valmiita ennen kuin hyväksymisesitys lähetetään hyväksyttäväksi.");
  }
}
