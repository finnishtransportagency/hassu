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
import { Kayttaja, Kieli, TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti } from "../database/model/projekti";
import { createLahetekirjeEmail } from "../email/lahetekirje/lahetekirjeEmailTemplate";
import { config } from "../config";
import { Readable } from "stream";
import { localDateTimeString } from "../util/dateUtil";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";

async function getFileAttachment(oid: string, key: string): Promise<Mail.Attachment> {
  log.info("haetaan s3:sta liitetiedosto", key);

  try {
    const output: GetObjectOutput = await getS3()
      .getObject({
        Bucket: config.yllapitoBucketName,
        Key: `yllapito/tiedostot/projekti/${oid}` + key,
      })
      .promise();

    if (output.Body instanceof Readable || output.Body instanceof Buffer) {
      return {
        filename: getFilename(key),
        contentDisposition: "attachment",
        contentType: "application/pdf",
        content: output.Body,
      };
    } else {
      log.error("Liitetiedoston sisallossa ongelmia");
    }
  } catch (error) {
    log.error("Virhe liitetiedostojen haussa", error);
  }

  return Promise.resolve(undefined);
}

function getFilename(path: string): string {
  return path.substring(path.lastIndexOf("/") + 1);
}

async function getKayttaja(uid: string): Promise<Kayttaja> {
  const kayttajas = await personSearch.getKayttajas();
  return kayttajas.getKayttajaByUid(uid);
}

async function sendWaitingApprovalMail(projekti: DBProjekti): Promise<void> {
  const emailOptions = createHyvaksyttavanaEmail(projekti);
  if (emailOptions.to) {
    await emailClient.sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
}

async function sendApprovalMailsAndAttachments(projekti: DBProjekti): Promise<void> {
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

    const aikaleima = localDateTimeString();
    aloituskuulutus.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => {
      kunta.lahetetty = aikaleima;
    });
    aloituskuulutus.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => {
      viranomainen.lahetetty = aikaleima;
    });
    await projektiDatabase.updateAloitusKuulutusJulkaisu(projekti, aloituskuulutus);
  } else {
    log.error("Ilmoitus aloituskuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }
}

class EmailHandler {
  async sendEmailsByToiminto(toiminto: TilasiirtymaToiminto, oid: string): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await sendWaitingApprovalMail(projekti);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      // ei viela maaritelty
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await sendApprovalMailsAndAttachments(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }
  }
}

export const emailHandler = new EmailHandler();
