import { emailClient } from "../../email/email";
import { createAloituskuulutusHyvaksyttavanaEmail } from "../../email/emailTemplates";
import { log } from "../../logger";
import { personSearch } from "../../personSearch/personSearchClient";
import { Kayttaja } from "../../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti, SahkopostiVastaanottaja } from "../../database/model";
import { config } from "../../config";
import { Readable } from "stream";
import { GetObjectCommand, GetObjectOutput } from "@aws-sdk/client-s3";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { getS3Client } from "../../aws/client";
import { aloituskuulutusHyvaksyntaEmailSender } from "./AloituskuulutusHyvaksyntaEmailSender";
import { hyvaksymisPaatosHyvaksyntaEmailSender } from "./sendHyvaksymiskuulutusEmails";
import { nahtavillaoloHyvaksyntaEmailSender } from "./sendNahtavillaoloKuulutusEmails";

export async function getFileAttachment(oid: string, key: string): Promise<Mail.Attachment | undefined> {
  log.info("haetaan s3:sta sähköpostiin liitetiedosto", { key });

  const getObjectParams = {
    Bucket: config.yllapitoBucketName,
    Key: `yllapito/tiedostot/projekti/${oid}` + key,
  };
  try {
    const output: GetObjectOutput = await getS3Client().send(new GetObjectCommand(getObjectParams));

    if (output.Body instanceof Readable) {
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

export async function getKayttaja(uid: string): Promise<Kayttaja | undefined> {
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

export function examineEmailSentResults(
  vastaanottaja: SahkopostiVastaanottaja,
  sentMessageInfo: SMTPTransport.SentMessageInfo | undefined,
  aikaleima: string
): void {
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
  await aloituskuulutusHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await hyvaksymisPaatosHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendNahtavillaKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await nahtavillaoloHyvaksyntaEmailSender.sendEmails(oid);
}
