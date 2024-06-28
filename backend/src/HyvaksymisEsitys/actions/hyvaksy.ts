import * as API from "hassu-common/graphql/apiModel";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { requireOmistaja, requirePermissionLuku } from "../../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { omit } from "lodash";
import { nyt, parseDate } from "../../util/dateUtil";
import { getHyvaksymisEsityksenLadatutTiedostot } from "../getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH, adaptFileName } from "../../tiedostot/paths";
import { deleteFilesUnderSpecifiedVaihe } from "../s3Calls/deleteFiles";
import { copyFilesFromVaiheToAnother } from "../s3Calls/copyFiles";
import { assertIsDefined } from "../../util/assertions";
import projektiDatabase, { HyvaksymisEsityksenTiedot } from "../dynamoKutsut";
import {
  createHyvaksymisesitysHyvaksyttyLaatijalleEmail,
  createHyvaksymisesitysHyvaksyttyPpEmail,
  createHyvaksymisesitysViranomaisilleEmail,
} from "../../email/emailTemplates";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { fileService } from "../../files/fileService";
import Mail from "nodemailer/lib/mailer";
import { validateVaiheOnAktiivinen } from "../validateVaiheOnAktiivinen";

export default async function hyvaksyHyvaksymisEsitys(input: API.TilaMuutosInput): Promise<string> {
  const nykyinenKayttaja = requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projektiInDB, "projekti pitää olla olemassa");
  await validate(projektiInDB);
  // Poista julkaistun hyväksymisesityksen nykyiset tiedostot
  await poistaJulkaistunHyvaksymisEsityksenTiedostot(oid, projektiInDB.julkaistuHyvaksymisEsitys);
  // Kopioi muokattavan hyväksymisesityksen tiedostot julkaistun hyväksymisesityksen tiedostojen sijaintiin
  assertIsDefined(projektiInDB.muokattavaHyvaksymisEsitys, "muokattavan hyväksymisesityksen olemassaolo on validoitu");
  await copyMuokattavaHyvaksymisEsitysFilesToJulkaistu(oid, projektiInDB.muokattavaHyvaksymisEsitys);

  // Lähetä email vastaanottajille
  const emailOptions = createHyvaksymisesitysViranomaisilleEmail(projektiInDB);
  let lahetysvirhe: boolean = false;
  if (emailOptions.to) {
    // Laita hyväksymisesitystiedostot liiteeksi sähköpostiin
    const promises = (projektiInDB.muokattavaHyvaksymisEsitys.hyvaksymisEsitys ?? []).map((he) =>
      fileService.getFileAsAttachment(projektiInDB.oid, `/hyvaksymisesitys/hyvaksymisEsitys/${adaptFileName(he.nimi)}`)
    );
    const attachments = await Promise.all(promises);
    if (attachments.find((a) => !a)) {
      log.error("Liitteiden lisääminen ilmoitukseen epäonnistui");
    }

    try {
      await emailClient.sendEmail({ ...emailOptions, attachments: attachments as Mail.Attachment[] });
    } catch (e) {
      lahetysvirhe = true;
      log.error("Sähköpostin lähettäminen vastaanottajille ei onnistunut", (e as Error).message);
    }
  } else {
    log.error("Ilmoitukselle ei loytynyt vastaanottajien sahkopostiosoitetta");
  }

  // Kopioi muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  // Vastaanottajiin lisätään lähetystieto.
  assertIsDefined(projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva, "Poistumispäivä on oltava määritelty tässä vaiheessa");
  const julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys = {
    ...omit(projektiInDB.muokattavaHyvaksymisEsitys, ["tila", "palautusSyy", "vastaanottajat"]),
    poistumisPaiva: projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva,
    hyvaksymisPaiva: nyt().format(),
    hyvaksyja: nykyinenKayttaja.uid,
    vastaanottajat: projektiInDB.muokattavaHyvaksymisEsitys.vastaanottajat?.map((vo) => ({
      ...vo,
      lahetetty: lahetysvirhe ? undefined : nyt().format(),
      lahetysvirhe,
    })),
  };
  await projektiDatabase.tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi({ oid, versio, julkaistuHyvaksymisEsitys });

  // Lähetä email hyväksymisesityksen laatijalle
  const emailOptions2 = createHyvaksymisesitysHyvaksyttyLaatijalleEmail(projektiInDB);
  if (emailOptions2.to) {
    await emailClient.sendEmail(emailOptions2);
  } else {
    log.error("Ilmoitukselle ei loytynyt laatijan sahkopostiosoitetta");
  }

  // Lähetä email projarille ja varahenkilöille
  const emailOptions3 = await createHyvaksymisesitysHyvaksyttyPpEmail(projektiInDB);
  if (emailOptions3.to) {
    await emailClient.sendEmail(emailOptions3);
  } else {
    log.error("Ilmoitukselle ei loytynyt projektipäällikön ja varahenkilöiden sahkopostiosoitetta");
  }

  return oid;
}

async function validate(projektiInDB: HyvaksymisEsityksenTiedot): Promise<API.NykyinenKayttaja> {
  // Toiminnon tekijän on oltava projektipäällikkö
  const nykyinenKayttaja = requireOmistaja(projektiInDB, "Hyväksymisesityksen voi hyväksyä vain projektipäällikkö");
  // Projektilla on oltava hyväksymistä odottava hyväksymisesitys
  if (projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA) {
    throw new IllegalArgumentError("Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä");
  }
  if (!projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva) {
    throw new IllegalArgumentError("Hyväksymisesitykseltä puuttuu poistumispäivämäärä");
  }
  if (parseDate(projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva).isBefore(nyt(), "day")) {
    throw new IllegalArgumentError("Hyväksymisesityksen poistumispäivämäärä ei voi olla menneisyydessä");
  }
  // Vaiheen on oltava vähintään NAHTAVILLAOLO_AINEISTOT
  await validateVaiheOnAktiivinen(projektiInDB);
  return nykyinenKayttaja;
}

async function poistaJulkaistunHyvaksymisEsityksenTiedostot(
  oid: string,
  julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys | undefined | null
) {
  if (!julkaistuHyvaksymisEsitys) {
    return;
  }
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(julkaistuHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(julkaistuHyvaksymisEsitys);
  await deleteFilesUnderSpecifiedVaihe(
    oid,
    JULKAISTU_HYVAKSYMISESITYS_PATH,
    [...tiedostot, ...aineistot],
    "uusi hyväksymisesitys julkaistaan"
  );
}

async function copyMuokattavaHyvaksymisEsitysFilesToJulkaistu(oid: string, muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys) {
  const tiedostot = getHyvaksymisEsityksenLadatutTiedostot(muokattavaHyvaksymisEsitys);
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  await copyFilesFromVaiheToAnother(oid, MUOKATTAVA_HYVAKSYMISESITYS_PATH, JULKAISTU_HYVAKSYMISESITYS_PATH, [...tiedostot, ...aineistot]);
}
