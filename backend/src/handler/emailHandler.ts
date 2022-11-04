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
import { Kayttaja, Kieli, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../database/model";
import { createLahetekirjeEmail } from "../email/lahetekirje/lahetekirjeEmailTemplate";
import { config } from "../config";
import { Readable } from "stream";
import { localDateTimeString } from "../util/dateUtil";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";
import { assertIsDefined } from "../util/assertions";

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
      return {
        filename: getFilename(key),
        contentDisposition: "attachment",
        contentType: output.ContentType || "application/pdf",
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

async function sendWaitingApprovalMail(projekti: DBProjekti): Promise<void> {
  const emailOptions = createHyvaksyttavanaEmail(projekti);
  if (emailOptions.to) {
    await emailClient.sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
}

async function sendAloitusKuulutusApprovalMailsAndAttachments(projekti: DBProjekti): Promise<void> {
  // aloituskuulutusjulkaisu kyllä löytyy
  const aloituskuulutus: AloitusKuulutusJulkaisu | undefined = asiakirjaAdapter.findAloitusKuulutusLastApproved(projekti);
  assertIsDefined(aloituskuulutus);
  // aloituskuulutus.muokkaaja on määritelty
  assertIsDefined(aloituskuulutus.muokkaaja);
  const muokkaaja: Kayttaja | undefined = await getKayttaja(aloituskuulutus.muokkaaja);
  assertIsDefined(muokkaaja);
  const emailOptionsMuokkaaja = createAloituskuulutusHyvaksyttyEmail(projekti, muokkaaja);
  if (emailOptionsMuokkaaja.to) {
    await emailClient.sendEmail(emailOptionsMuokkaaja);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt aloituskuulutuksen laatijan sahkopostiosoitetta");
  }

  const emailOptionsPDF = createAloituskuulutusHyvaksyttyPDFEmail(projekti);
  if (emailOptionsPDF.to) {
    const pdfPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
    if (!pdfPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
      );
    }
    const aloituskuulutusPDF = await getFileAttachment(projekti.oid, pdfPath);
    if (!aloituskuulutusPDF) {
      throw new Error("AloituskuulutusPDF:n saaminen epäonnistui");
    }
    emailOptionsPDF.attachments = [aloituskuulutusPDF];
    await emailClient.sendEmail(emailOptionsPDF);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = createLahetekirjeEmail(projekti);
  if (emailOptionsLahetekirje.to) {
    // PDFt on jo olemassa
    const aloituskuulutusPDFtSUOMI = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI];
    assertIsDefined(aloituskuulutusPDFtSUOMI);
    const aloituskuulutusIlmoitusPDF = await getFileAttachment(projekti.oid, aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath);
    if (!aloituskuulutusIlmoitusPDF) {
      throw new Error("AloituskuulutusIlmoitusPDF:n saaminen epäonnistui");
    }
    emailOptionsLahetekirje.attachments = [aloituskuulutusIlmoitusPDF];
    await emailClient.sendEmail(emailOptionsLahetekirje);

    const aikaleima = localDateTimeString();
    aloituskuulutus.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => {
      kunta.lahetetty = aikaleima;
    });
    aloituskuulutus.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => {
      viranomainen.lahetetty = aikaleima;
    });
    await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, aloituskuulutus);
  } else {
    log.error("Ilmoitus aloituskuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }
}

class EmailHandler {
  async sendEmailsByToiminto(toiminto: TilasiirtymaToiminto, oid: string, tyyppi: TilasiirtymaTyyppi): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new Error("Projekti on poistettu tietokannasta!");
    }
    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await sendWaitingApprovalMail(projekti);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      // ei viela maaritelty
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      switch (tyyppi) {
        case TilasiirtymaTyyppi.ALOITUSKUULUTUS:
          return sendAloitusKuulutusApprovalMailsAndAttachments(projekti);
        case TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE:
        case TilasiirtymaTyyppi.JATKOPAATOS_1:
        case TilasiirtymaTyyppi.JATKOPAATOS_2:
        // TODO lähetä sähköpostit
      }
    } else if (toiminto == TilasiirtymaToiminto.UUDELLEENKUULUTA) {
      // Do nothing
    } else {
      throw new Error("Tuntematon toiminto");
    }
  }
}

export const emailHandler = new EmailHandler();
