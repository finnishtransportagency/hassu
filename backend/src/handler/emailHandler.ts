import { projektiDatabase } from "../database/projektiDatabase";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { emailClient } from "../email/email";
import {
  createAloituskuulutusHyvaksyttyEmail,
  createAloituskuulutusHyvaksyttyPDFEmail,
  createHyvaksyttavanaEmail,
} from "../email/emailTemplates";
import { log } from "../logger";
import { personSearch } from "../personSearch/personSearchClient";
import { Kieli, TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti } from "../database/model/projekti";
import { getS3Client } from "../aws/clients";
import { GetObjectCommand, GetObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";
import { createLahetekirjeEmail } from "../email/lahetekirje/lahetekirjeEmailTemplate";
import { config } from "../config";
import { Readable } from "stream";

async function getFileAttachment(oid: string, key: string): Promise<Mail.Attachment> {
  const s3Client: S3Client = getS3Client();
  log.info("haetaan s3:sta liitetiedosto", key);

  try {
    const output: GetObjectCommandOutput = await s3Client.send(
      new GetObjectCommand({
        Bucket: config.yllapitoBucketName,
        Key: `yllapito/tiedostot/projekti/${oid}` + key,
      })
    );

    if (output.Body instanceof Readable) {
      return {
        filename: getFilename(key),
        contentDisposition: "attachment",
        contentType: "application/pdf",
        content: output.Body as Readable,
      };
    } else {
      log.error("Liitetiedoston sisaltossa ongelmia");
    }
  } catch (error) {
    log.error("Virhe liitetiedostojen haussa", error);
  }
}

function getFilename(path: string): string {
  return path.substring(path.lastIndexOf("/") + 1);
}

async function getKayttaja(uid: string) {
  const kayttajas = await personSearch.getKayttajas();
  return kayttajas.getKayttajaByUid(uid);
}

async function sendWaitingApprovalMails(projekti: DBProjekti) {
  const emailOptions = createHyvaksyttavanaEmail(projekti);
  if (emailOptions.to) {
    await emailClient.sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
}

async function sendApprovalMailsAndAttachments(projekti: DBProjekti) {
  const aloituskuulutus = asiakirjaAdapter.findAloitusKuulutusLastApproved(projekti);
  const muokkaaja = await getKayttaja(aloituskuulutus.muokkaaja);
  const emailOptionsMuokkaaja = createAloituskuulutusHyvaksyttyEmail(projekti, muokkaaja);
  if (emailOptionsMuokkaaja.to) {
    await emailClient.sendEmail(emailOptionsMuokkaaja);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt aloituskuulutuksen laatijan sahkopostiosoitetta");
  }

  const emailOptionsPDF = createAloituskuulutusHyvaksyttyPDFEmail(projekti);
  if (emailOptionsPDF.to) {
    const aloituskuulutusPDF = await getFileAttachment(
      projekti.oid,
      aloituskuulutus.aloituskuulutusPDFt[Kieli.SUOMI].aloituskuulutusPDFPath
    );
    emailOptionsPDF.attachments = [aloituskuulutusPDF];
    await emailClient.sendEmail(emailOptionsPDF);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = createLahetekirjeEmail(projekti);
  if (emailOptionsLahetekirje.to) {
    const aloituskuulutusIlmoitusPDF = await getFileAttachment(
      projekti.oid,
      aloituskuulutus.aloituskuulutusPDFt[Kieli.SUOMI].aloituskuulutusIlmoitusPDFPath
    );
    emailOptionsLahetekirje.attachments = [aloituskuulutusIlmoitusPDF];
    await emailClient.sendEmail(emailOptionsLahetekirje);
  } else {
    log.error("Ilmoitus aloituskuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }

  return Promise.resolve(undefined);
}

class EmailHandler {
  async sendEmailsByToiminto(toiminto: TilasiirtymaToiminto, oid: string) {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await sendWaitingApprovalMails(projekti);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      // ei viela maaritelty
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await sendApprovalMailsAndAttachments(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }
}

export const emailHandler = new EmailHandler();
