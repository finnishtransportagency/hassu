import * as API from "hassu-common/graphql/apiModel";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../database/model";
import { requireOmistaja, requirePermissionLuku } from "../../user/userService";
import { IllegalArgumentError } from "hassu-common/error";
import { omit } from "lodash";
import { nyt, parseDate } from "../../util/dateUtil";
import { getHyvaksymisEsityksenLadatutTiedostot } from "../getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot from "../getAineistot";
import {
  JULKAISTU_HYVAKSYMISESITYS_PATH,
  MUOKATTAVA_HYVAKSYMISESITYS_PATH,
  adaptFileName,
  getYllapitoPathForProjekti,
  joinPath,
} from "../../tiedostot/paths";
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
import { S3_METADATA_ASIAKIRJATYYPPI, fileService } from "../../files/fileService";
import Mail from "nodemailer/lib/mailer";
import { validateVaiheOnAktiivinen } from "../validateVaiheOnAktiivinen";
import { EmailOptions } from "../../email/model/emailOptions";
import { emailOptionsToEml, isEmailSent } from "../../email/emailUtil";
import putFile from "../s3Calls/putFile";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { AsiakirjaTyyppi } from "@hassu/asianhallinta";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { uuid } from "hassu-common/util/uuid";
import { isVaylaAsianhallinta } from "hassu-common/isVaylaAsianhallinta";

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
  let messageInfo: SMTPTransport.SentMessageInfo | undefined;
  let s3PathForEmail: string | undefined;
  if (emailOptions.to) {
    // Laita hyväksymisesitystiedostot liiteeksi sähköpostiin
    const promises = (projektiInDB.muokattavaHyvaksymisEsitys.hyvaksymisEsitys ?? []).map((he) =>
      fileService.getFileAsAttachment(projektiInDB.oid, `/hyvaksymisesitys/hyvaksymisEsitys/${adaptFileName(he.nimi)}`)
    );
    const attachments = await Promise.all(promises);
    if (attachments.find((a) => !a)) {
      log.error("Liitteiden lisääminen ilmoitukseen epäonnistui");
    }
    // Tallenna s.posti S3:een
    s3PathForEmail = await saveEmailAsFile(oid, emailOptions);
    messageInfo = await emailClient.sendEmail({ ...emailOptions, attachments: attachments as Mail.Attachment[] });
  } else {
    log.error("Ilmoitukselle ei loytynyt vastaanottajien sahkopostiosoitetta");
  }

  const asiatunnus = projektiInDB.velho?.asiatunnusVayla ?? projektiInDB.velho?.asiatunnusELY;
  assertIsDefined(asiatunnus, "Joko väylä- tai ELY-asiatunnus on olemassa");

  let asianhallintaEventId: string | undefined;
  if (s3PathForEmail) {
    // Laita synkronointi-event ashaan ja tietokantaan
    asianhallintaEventId = uuid.v4();
    await asianhallintaService.saveAndEnqueueSynchronization(oid, {
      asiatunnus,
      asianhallintaEventId,
      vaylaAsianhallinta: isVaylaAsianhallinta(projektiInDB),
      dokumentit: [
        {
          s3Path: s3PathForEmail,
        },
      ],
    });
  }

  // Kopioi muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  // Vastaanottajiin lisätään lähetystieto.

  const vastaanottajat = projektiInDB.muokattavaHyvaksymisEsitys.vastaanottajat?.map((vo) => {
    if (isEmailSent(vo.sahkoposti, messageInfo)) {
      return {
        ...vo,
        lahetetty: nyt().format(),
        messageId: messageInfo?.messageId,
      };
    } else {
      if (messageInfo) {
        log.error(`Sähköpostin lähettäminen vastaanottajalle ${vo.sahkoposti} ei onnistunut`);
      }
      return {
        ...vo,
        lahetysvirhe: true,
      };
    }
  });

  assertIsDefined(projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva, "Poistumispäivä on oltava määritelty tässä vaiheessa");
  const julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys = {
    ...omit(projektiInDB.muokattavaHyvaksymisEsitys, ["tila", "palautusSyy", "vastaanottajat"]),
    poistumisPaiva: projektiInDB.muokattavaHyvaksymisEsitys.poistumisPaiva,
    hyvaksymisPaiva: nyt().format(),
    hyvaksyja: nykyinenKayttaja.uid,
    vastaanottajat,
    asianhallintaEventId,
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
  // Asianhallinnan on oltava oikeassa tilassa, jos asha-integraatio on käytössä
  const asianhallinnanTila = await asianhallintaService.checkAsianhallintaState(projektiInDB.oid, "HYVAKSYMISESITYS");
  if (asianhallinnanTila && asianhallinnanTila !== API.AsianTila.VALMIS_VIENTIIN) {
    throw new IllegalArgumentError(`Suunnitelman asia ei ole valmis vientiin. Vaihe: hyväksymisesitys, tila: ${asianhallinnanTila}`);
  }
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

async function saveEmailAsFile(oid: string, emailOptions: EmailOptions): Promise<string> {
  const filename = `${nyt().format("YYYYMMDD-HHmmss")}_hyvaksymisesitys.eml`;
  const contents = await emailOptionsToEml(emailOptions);
  const targetPath = joinPath(getYllapitoPathForProjekti(oid), "hyvaksymisesityksen_spostit", adaptFileName(filename));
  const asiakirjaTyyppi: AsiakirjaTyyppi = API.AsiakirjaTyyppi.HYVAKSYMISESITYS_SAHKOPOSTI;
  const metadata = {
    [S3_METADATA_ASIAKIRJATYYPPI]: asiakirjaTyyppi,
  };
  await putFile({
    contents,
    filename,
    targetPath,
    metadata,
  });
  return targetPath;
}
