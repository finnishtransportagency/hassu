import * as API from "hassu-common/graphql/apiModel";
import {
  DBProjekti,
  ILadattuTiedosto,
  JulkaistuHyvaksymisEsitys,
  MuokattavaHyvaksymisEsitys,
  SahkopostiVastaanottaja,
} from "../../database/model";
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
import { AsiakirjaTyyppi } from "@hassu/asianhallinta";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { uuid } from "hassu-common/util/uuid";
import { isVaylaAsianhallinta } from "hassu-common/isVaylaAsianhallinta";
import { getAsiatunnus } from "../../projekti/projektiUtil";

export default async function hyvaksyHyvaksymisEsitys(input: API.TilaMuutosInput): Promise<string> {
  const nykyinenKayttaja = requirePermissionLuku();
  const { oid, versio } = input;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  const asiatunnus = getAsiatunnus(projektiInDB?.velho);
  assertIsDefined(projektiInDB?.muokattavaHyvaksymisEsitys?.poistumisPaiva, "Poistumispäivä on oltava määritelty tässä vaiheessa");
  assertIsDefined(asiatunnus, "Joko Väylä- tai ELY-asiatunnus on olemassa");

  await validate(projektiInDB);
  // Poista julkaistun hyväksymisesityksen nykyiset tiedostot
  await poistaJulkaistunHyvaksymisEsityksenTiedostot(oid, projektiInDB.julkaistuHyvaksymisEsitys);
  // Kopioi muokattavan hyväksymisesityksen tiedostot julkaistun hyväksymisesityksen tiedostojen sijaintiin
  await copyMuokattavaHyvaksymisEsitysFilesToJulkaistu(oid, projektiInDB.muokattavaHyvaksymisEsitys);

  // Lähetä email vastaanottajille
  const { vastaanottajat, asianhallintaEventId } = await sendEmailsToHyvaksymisesitysRecipients(projektiInDB, asiatunnus);

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
    log.error("Ilmoitukselle ei löytynyt laatijan sähköpostiosoitetta");
  }

  // Lähetä email projarille ja varahenkilöille
  const emailOptions3 = await createHyvaksymisesitysHyvaksyttyPpEmail(projektiInDB);
  if (emailOptions3.to) {
    await emailClient.sendEmail(emailOptions3);
  } else {
    log.error("Ilmoitukselle ei löytynyt projektipäällikön ja varahenkilöiden sähköpostiosoitetta");
  }

  return oid;
}

async function sendEmailsToHyvaksymisesitysRecipients(
  projektiInDB: DBProjekti,
  asiatunnus: string
): Promise<{ vastaanottajat: SahkopostiVastaanottaja[] | undefined; asianhallintaEventId: string | undefined }> {
  const recipients = projektiInDB.muokattavaHyvaksymisEsitys?.vastaanottajat;
  if (!recipients?.length) {
    log.error("Ilmoitukselle ei löytynyt vastaanottajien sähköpostiosoitteita");
    return { vastaanottajat: undefined, asianhallintaEventId: undefined };
  }
  const hyvaksymisesitysAttachments = await getHyvaksymisesitysAineistotAsAttachments(
    projektiInDB.oid,
    projektiInDB?.muokattavaHyvaksymisEsitys?.hyvaksymisEsitys
  );
  const emailOptions = createHyvaksymisesitysViranomaisilleEmail(
    projektiInDB,
    recipients?.map((vo) => vo.sahkoposti),
    hyvaksymisesitysAttachments
  );

  // Tallenna s.posti S3:een ilman liitteitä
  const s3PathForEmail = await saveEmailAsFile(projektiInDB.oid, emailOptions);
  const messageInfo = await emailClient.sendTurvapostiEmail({ ...emailOptions, attachments: hyvaksymisesitysAttachments });
  // Laita synkronointi-event ashaan
  const asianhallintaEventId = uuid.v4();
  await asianhallintaService.saveAndEnqueueSynchronization(projektiInDB.oid, {
    asiatunnus,
    toimenpideTyyppi: "ENSIMMAINEN_VERSIO",
    asianhallintaEventId,
    vaylaAsianhallinta: isVaylaAsianhallinta(projektiInDB),
    dokumentit: [
      {
        s3Path: s3PathForEmail,
      },
    ],
  });
  // Kopioi muokattavaHyvaksymisEsitys julkaistuHyvaksymisEsitys-kenttään. Tila ei tule mukaan. Julkaistupäivä ja hyväksyjätieto tulee.
  // Vastaanottajiin lisätään lähetystieto.
  const vastaanottajat: SahkopostiVastaanottaja[] = recipients?.map((vo) => {
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
  return { vastaanottajat, asianhallintaEventId };
}

async function getHyvaksymisesitysAineistotAsAttachments(
  oid: string,
  tiedostot: ILadattuTiedosto[] | null | undefined
): Promise<Mail.Attachment[]> {
  // 30MB
  const maxAllowedCombinedSize = 30 * 1024 * 1024;

  const attachmentsAndSizes = await Promise.all(
    (tiedostot ?? []).map(async (tiedosto) => {
      const key = `/hyvaksymisesitys/hyvaksymisEsitys/${adaptFileName(tiedosto.nimi)}`;
      const { attachment, size } = await fileService.getYllapitoFileAsAttachmentAndItsSize(oid, key);
      return { key, attachment, size };
    })
  );

  const combinedFileSize = attachmentsAndSizes.reduce((totalSize, { size = 0 }) => (totalSize += size), 0);

  if (combinedFileSize > maxAllowedCombinedSize) {
    log.error("Hyväksymisesityksen liitetiedostoja ei voida lisätä lomakkeelle. Liitetiedostojen maksikoko ylittyi", {
      combinedFileSize,
      maxAllowedCombinedSize,
    });
    return [];
  }

  return attachmentsAndSizes.reduce<Mail.Attachment[]>((attachments, { attachment, key }) => {
    if (!attachment) {
      log.error("Liitteen lisääminen ilmoitukseen epäonnistui", { key });
    } else {
      attachments.push(attachment);
    }
    return attachments;
  }, []);
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
  const asianhallinnanTila = await asianhallintaService.checkAsianhallintaStateForKnownProjekti(projektiInDB, "HYVAKSYMISESITYS");
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
