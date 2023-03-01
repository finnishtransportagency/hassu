import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import {
  createAloituskuulutusHyvaksyttavanaEmail,
  createAloituskuulutusHyvaksyttyEmail,
  createAloituskuulutusHyvaksyttyPDFEmail,
} from "../email/emailTemplates";
import { log } from "../logger";
import { personSearch } from "../personSearch/personSearchClient";
import { Kayttaja, Kieli, LaskuriTyyppi } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { AloitusKuulutusJulkaisu, DBProjekti, SahkopostiVastaanottaja } from "../database/model";
import { createLahetekirjeEmail } from "../email/lahetekirje/lahetekirjeEmailTemplate";
import { config } from "../config";
import { Readable } from "stream";
import { localDateTimeString } from "../util/dateUtil";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";
import { assertIsDefined } from "../util/assertions";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";

export async function getFileAttachment(oid: string, key: string): Promise<Mail.Attachment | undefined> {
  log.info("haetaan s3:sta liitetiedosto", key);

  if (!config.yllapitoBucketName) {
    throw new Error("config.yllapitoBucketName määrittelemättä");
  }
  const getObjectParams = {
    Bucket: config.yllapitoBucketName,
    Key: `yllapito/tiedostot/projekti/${oid}` + key,
  };
  try {
    const output: GetObjectOutput = await getS3().getObject(getObjectParams).promise();

    if (output.Body instanceof Readable || output.Body instanceof Buffer) {
      let contentType = output.ContentType;
      if (contentType == "null") {
        contentType = undefined;
      }
      return {
        filename: getFilename(key),
        contentDisposition: "attachment",
        contentType: contentType || "application/octet-stream",
        content: output.Body,
      };
    } else {
      log.error("Liitetiedoston sisallossa ongelmia");
    }
  } catch (error) {
    log.error("Virhe liitetiedostojen haussa", { error, getObjectParams });
  }

  return Promise.resolve(undefined);
}

function getFilename(path: string): string {
  return path.substring(path.lastIndexOf("/") + 1);
}

async function getKayttaja(uid: string): Promise<Kayttaja | undefined> {
  const kayttajas = await personSearch.getKayttajas();
  return kayttajas.getKayttajaByUid(uid);
}

export async function sendWaitingApprovalMail(projekti: DBProjekti): Promise<void> {
  const emailOptions = createAloituskuulutusHyvaksyttavanaEmail(projekti);
  if (emailOptions.to) {
    await emailClient.sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
}

function examineEmailSentResults(
  vastaanottaja: SahkopostiVastaanottaja,
  sentMessageInfo: SMTPTransport.SentMessageInfo | undefined,
  aikaleima: string
) {
  // Sähköpostien lähetyksessä tapahtui virhe
  if (!sentMessageInfo) {
    vastaanottaja.lahetysvirhe = true;
  }
  const email = vastaanottaja.sahkoposti;
  if (sentMessageInfo?.accepted.find((accepted) => accepted == email) || sentMessageInfo?.pending?.find((pending) => pending == email)) {
    vastaanottaja.lahetetty = aikaleima;
    vastaanottaja.messageId = sentMessageInfo?.messageId;
    log.info("Email lähetetty", { sentEmail: email, actualEmailAddress: config.emailsTo });
  }
  if (sentMessageInfo?.rejected.find((rejected) => rejected == email)) {
    log.info("Email lähetysvirhe", { rejectedEmail: email });
    vastaanottaja.lahetysvirhe = true;
  }
}

export async function sendAloitusKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti, "projekti pitää olla olemassa");
  assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  // aloituskuulutusjulkaisu kyllä löytyy
  const aloituskuulutus: AloitusKuulutusJulkaisu | undefined = asiakirjaAdapter.findAloitusKuulutusLastApproved(projekti);
  assertIsDefined(aloituskuulutus, "Aloituskuulutuksella ei ole hyväksyttyä julkaisua");
  assertIsDefined(aloituskuulutus.kuulutusPaiva);
  assertIsDefined(aloituskuulutus.hankkeenKuvaus);
  const adapter = new AloituskuulutusKutsuAdapter({
    ...pickCommonAdapterProps(projekti, aloituskuulutus.hankkeenKuvaus, Kieli.SUOMI),
    ...aloituskuulutus,
    kuulutusPaiva: aloituskuulutus.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: await calculateEndDate({
      alkupaiva: aloituskuulutus.kuulutusPaiva,
      tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
    }),
  });
  // aloituskuulutus.muokkaaja on määritelty
  assertIsDefined(aloituskuulutus.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(aloituskuulutus.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");
  const emailOptionsMuokkaaja = createAloituskuulutusHyvaksyttyEmail(adapter, muokkaaja);
  if (emailOptionsMuokkaaja.to) {
    await emailClient.sendEmail(emailOptionsMuokkaaja);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt aloituskuulutuksen laatijan sahkopostiosoitetta");
  }

  const emailOptionsPDF = createAloituskuulutusHyvaksyttyPDFEmail(adapter);
  if (emailOptionsPDF.to) {
    const pdfPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
    if (!pdfPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
      );
    }
    const aloituskuulutusPDF = await getFileAttachment(adapter.oid, pdfPath);
    if (!aloituskuulutusPDF) {
      throw new Error("AloituskuulutusPDF:n saaminen epäonnistui");
    }
    emailOptionsPDF.attachments = [aloituskuulutusPDF];
    await emailClient.sendEmail(emailOptionsPDF);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = createLahetekirjeEmail(adapter);
  if (emailOptionsLahetekirje.to) {
    // PDFt on jo olemassa
    const aloituskuulutusPDFtSUOMI = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI];
    assertIsDefined(aloituskuulutusPDFtSUOMI);
    const aloituskuulutusIlmoitusPDFSUOMI = await getFileAttachment(adapter.oid, aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath);
    if (!aloituskuulutusIlmoitusPDFSUOMI) {
      throw new Error("AloituskuulutusIlmoitusPDFSUOMI:n saaminen epäonnistui");
    }
    let aloituskuulutusIlmoitusPDFToinenKieli = undefined;
    const toinenKieli = [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
      ? Kieli.RUOTSI
      : projekti.kielitiedot?.toissijainenKieli
      ? Kieli.SAAME
      : undefined;
    //TODO SAAME
    if (toinenKieli === Kieli.RUOTSI) {
      const aloituskuulutusPDFtToinenKieli = aloituskuulutus.aloituskuulutusPDFt?.[toinenKieli];
      assertIsDefined(aloituskuulutusPDFtToinenKieli);
      aloituskuulutusIlmoitusPDFToinenKieli = await getFileAttachment(
        adapter.oid,
        aloituskuulutusPDFtToinenKieli.aloituskuulutusIlmoitusPDFPath
      );
      if (!aloituskuulutusIlmoitusPDFToinenKieli) {
        throw new Error("AloituskuulutusIlmoitusPDFToinenKieli:n saaminen epäonnistui");
      }
    }

    emailOptionsLahetekirje.attachments = [aloituskuulutusIlmoitusPDFSUOMI];
    if (aloituskuulutusIlmoitusPDFToinenKieli) {
      emailOptionsLahetekirje.attachments.push(aloituskuulutusIlmoitusPDFToinenKieli);
    }
    const sentMessageInfo = await emailClient.sendEmail(emailOptionsLahetekirje);

    const aikaleima = localDateTimeString();
    aloituskuulutus.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => examineEmailSentResults(kunta, sentMessageInfo, aikaleima));
    aloituskuulutus.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
      examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
    );
    await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, aloituskuulutus);
  } else {
    log.error("Ilmoitus aloituskuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }
}
