import { projektiDatabase } from "../database/projektiDatabase";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { sendEmail } from "../email/email";
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
import { S3Client } from "@aws-sdk/client-s3";

async function getFileAttachment(path: string): Promise<Mail.Attachment> {
  const s3Client:S3Client = getS3Client();
  log.log("haetaan s3:sta pdf", path);
  return {
    filename: "",
    contentDisposition: "attachment",
    contentType: "application/pdf",
    content: "kontenttia",
  };
}

async function getKayttaja(uid: string) {
  const kayttajas = await personSearch.getKayttajas();
  return kayttajas.getKayttajaByUid(uid);
}

async function sendApprovalMails(projekti: DBProjekti) {
  const aloituskuulutus = asiakirjaAdapter.findAloitusKuulutusLastApproved(projekti);
  const muokkaaja = await getKayttaja(aloituskuulutus.muokkaaja);
  const emailOptions = createAloituskuulutusHyvaksyttyEmail(projekti, muokkaaja);
  if (emailOptions.to) {
    await sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt muokkaajan sahkopostiosoitetta");
  }

  const aloituskuulutusPDF = await getFileAttachment(aloituskuulutus.aloituskuulutusPDFt[Kieli.SUOMI].aloituskuulutusPDFPath);
  const emailOptionsPDF = createAloituskuulutusHyvaksyttyPDFEmail(projekti);
  if (emailOptionsPDF.to) {
    emailOptionsPDF.attachments = [aloituskuulutusPDF];
    await sendEmail(emailOptionsPDF);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const aloituskuulutusIlmoitusPDF = await getFileAttachment(aloituskuulutus.aloituskuulutusPDFt[Kieli.SUOMI].aloituskuulutusIlmoitusPDFPath);

  return Promise.resolve(undefined);
}

class EmailHandler {
  async sendEmail(toiminto: TilasiirtymaToiminto, oid: string) {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      const emailOptions = createHyvaksyttavanaEmail(projekti);
      if (emailOptions.to) {
        await sendEmail(emailOptions);
      } else {
        log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
      }
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      const emailOptions = createHyvaksyttavanaEmail(projekti);
      if (emailOptions.to) {
        await sendEmail(emailOptions);
      } else {
        log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
      }
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await sendApprovalMails(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }
}

export const emailHandler = new EmailHandler();
