import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import { createAloituskuulutusHyvaksyttavanaEmail } from "../email/emailTemplates";
import { log } from "../logger";
import { personSearch } from "../personSearch/personSearchClient";
import { AsiakirjaTyyppi, Kayttaja, Kieli } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { AloitusKuulutusJulkaisu, DBProjekti, NahtavillaoloVaiheJulkaisu, SahkopostiVastaanottaja } from "../database/model";
import { config } from "../config";
import { Readable } from "stream";
import { localDateTimeString } from "../util/dateUtil";
import { GetObjectCommand, GetObjectOutput } from "@aws-sdk/client-s3";
import { assertIsDefined } from "../util/assertions";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { getS3Client } from "../aws/client";
import { AloituskuulutusEmailCreator } from "../email/aloituskuulutusEmailCreator";
import { HyvaksymisPaatosEmailCreator } from "../email/hyvaksymisPaatosEmailCreator";
import { NahtavillaoloEmailCreator } from "../email/nahtavillaoloEmailCreator";
import { saveEmailAsFile } from "../email/emailUtil";
import { ProjektiPaths } from "../files/ProjektiPath";

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
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti, "projekti pitää olla olemassa");
  // aloituskuulutusjulkaisu kyllä löytyy
  const aloituskuulutus: AloitusKuulutusJulkaisu | undefined = asiakirjaAdapter.findAloitusKuulutusLastApproved(projekti);
  assertIsDefined(aloituskuulutus, "Aloituskuulutuksella ei ole hyväksyttyä julkaisua");
  const emailCreator = await AloituskuulutusEmailCreator.newInstance(projekti, aloituskuulutus);
  // aloituskuulutus.muokkaaja on määritelty
  assertIsDefined(aloituskuulutus.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(aloituskuulutus.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu. Muokkaaja:" + muokkaaja);

  const hyvaksyttyEmailMuokkajalle = emailCreator.createHyvaksyttyEmailMuokkaajalle(muokkaaja);
  if (hyvaksyttyEmailMuokkajalle.to) {
    await emailClient.sendEmail(hyvaksyttyEmailMuokkajalle);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt aloituskuulutuksen laatijan sahkopostiosoitetta");
  }

  const aloituskuulutusHyvaksyttyEmail = emailCreator.createHyvaksyttyEmail();
  if (aloituskuulutusHyvaksyttyEmail.to) {
    const pdfSuomiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
    if (!pdfSuomiPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
      );
    }
    const aloituskuulutusSuomiPDF = await getFileAttachment(oid, pdfSuomiPath);
    if (!aloituskuulutusSuomiPDF) {
      throw new Error("AloituskuulutusSuomiPDF:n saaminen epäonnistui");
    }
    aloituskuulutusHyvaksyttyEmail.attachments = [aloituskuulutusSuomiPDF];

    if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
      const pdfRuotsiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusPDFPath;
      if (!pdfRuotsiPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusPDFPath on määrittelemättä`
        );
      }
      const aloituskuulutusRuotsiPDF = await getFileAttachment(oid, pdfRuotsiPath);
      if (!aloituskuulutusRuotsiPDF) {
        throw new Error("AloituskuulutusRuotsiPDF:n saaminen epäonnistui");
      }
      aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusRuotsiPDF);
    }

    await emailClient.sendEmail(aloituskuulutusHyvaksyttyEmail);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = emailCreator.createLahetekirje();
  if (emailOptionsLahetekirje.to) {
    // PDFt on jo olemassa
    const aloituskuulutusPDFtSUOMI = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI];
    assertIsDefined(aloituskuulutusPDFtSUOMI);
    const aloituskuulutusIlmoitusPDFSUOMI = await getFileAttachment(oid, aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath);
    if (!aloituskuulutusIlmoitusPDFSUOMI) {
      throw new Error("AloituskuulutusIlmoitusPDFSUOMI:n saaminen epäonnistui");
    }
    let aloituskuulutusIlmoitusPDFToinenKieli = undefined;
    const toinenKieli = [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
      ? Kieli.RUOTSI
      : undefined;
    if (toinenKieli === Kieli.RUOTSI) {
      const aloituskuulutusPDFtToinenKieli = aloituskuulutus.aloituskuulutusPDFt?.[toinenKieli];
      assertIsDefined(aloituskuulutusPDFtToinenKieli);
      aloituskuulutusIlmoitusPDFToinenKieli = await getFileAttachment(oid, aloituskuulutusPDFtToinenKieli.aloituskuulutusIlmoitusPDFPath);
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
    aloituskuulutus.lahetekirje = await saveEmailAsFile(
      projekti.oid,
      new ProjektiPaths(projekti.oid).aloituskuulutus(aloituskuulutus),
      emailOptionsLahetekirje,
      AsiakirjaTyyppi.ALOITUSKUULUTUS_LAHETEKIRJE
    );
    await projektiDatabase.aloitusKuulutusJulkaisut.update(projekti, aloituskuulutus);
  } else {
    log.error("Ilmoitus aloituskuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }
}

export async function sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti, "projekti pitää olla olemassa");
  const julkaisu = asiakirjaAdapter.findHyvaksymisKuulutusLastApproved(projekti);
  assertIsDefined(julkaisu, "Projektilla ei hyväksyttyä julkaisua");
  const emailCreator = await HyvaksymisPaatosEmailCreator.newInstance(projekti, julkaisu);

  assertIsDefined(julkaisu.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(julkaisu.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");
  const hyvaksyttyEmailMuokkajalle = emailCreator.createHyvaksyttyEmailMuokkaajalle(muokkaaja);
  if (hyvaksyttyEmailMuokkajalle.to) {
    await emailClient.sendEmail(hyvaksyttyEmailMuokkajalle);
  } else {
    log.error("Kuulutukselle ei loytynyt laatijan sahkopostiosoitetta");
  }

  const projektinKielet = [julkaisu.kielitiedot?.ensisijainenKieli, julkaisu.kielitiedot?.toissijainenKieli].filter(
    (kieli): kieli is Kieli => !!kieli
  );

  const emailToProjektiPaallikko = emailCreator.createHyvaksyttyEmail();
  if (emailToProjektiPaallikko.to) {
    emailToProjektiPaallikko.attachments = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt || {})
      .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
      .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
        const kuulutusPdfPath = pdft.hyvaksymisKuulutusPDFPath;
        const ilmoitusPdfPath = pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath;
        if (!kuulutusPdfPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.hyvaksymisKuulutusPDFPath on määrittelemättä`
          );
        }
        if (!ilmoitusPdfPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath on määrittelemättä`
          );
        }
        const kuulutusPDF = await getFileAttachment(oid, kuulutusPdfPath);
        const ilmoitusPdf = await getFileAttachment(oid, ilmoitusPdfPath);
        if (!kuulutusPDF) {
          throw new Error(`sendApprovalMailsAndAttachments: hyvaksymiskuulutusPDF:ää ei löytynyt kielellä '${kieli}'`);
        }
        if (!ilmoitusPdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusPdf:ää ei löytynyt kielellä '${kieli}'`);
        }
        (await lahetettavatPDFt).push(kuulutusPDF, ilmoitusPdf);
        return lahetettavatPDFt;
      }, Promise.resolve([]));
    await emailClient.sendEmail(emailToProjektiPaallikko);
  } else {
    log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailToKunnatPDF = emailCreator.createHyvaksymispaatosHyvaksyttyViranomaisille();
  if (emailToKunnatPDF.to) {
    const pdft = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt || {})
      .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
      .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
        const ilmoitusKuulutusPdfPath = pdft.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath;
        const ilmoitusKunnallePdfPath = pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath;
        if (!ilmoitusKuulutusPdfPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath on määrittelemättä`
          );
        }
        if (!ilmoitusKunnallePdfPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath on määrittelemättä`
          );
        }
        const ilmoitusKuulutusPdf = await getFileAttachment(oid, ilmoitusKuulutusPdfPath);
        const ilmoitusKunnallePdf = await getFileAttachment(oid, ilmoitusKunnallePdfPath);
        if (!ilmoitusKuulutusPdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusKuulutusPdf:ää ei löytynyt kielellä '${kieli}'`);
        }
        if (!ilmoitusKunnallePdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusKunnallePdf:ää ei löytynyt kielellä '${kieli}'`);
        }
        (await lahetettavatPDFt).push(ilmoitusKuulutusPdf, ilmoitusKunnallePdf);
        return lahetettavatPDFt;
      }, Promise.resolve([]));
    const paatosTiedostot =
      (await julkaisu.hyvaksymisPaatos?.reduce<Promise<Mail.Attachment[]>>(async (tiedostot, aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error(
            `sendApprovalMailsAndAttachments: Aineiston tunnisteella '${aineisto?.dokumenttiOid}' tiedostopolkua ei ole määritelty`
          );
        }
        const aineistoTiedosto = await getFileAttachment(oid, aineisto.tiedosto);
        if (!aineistoTiedosto) {
          throw new Error(
            `sendApprovalMailsAndAttachments: Aineiston tunnisteella '${aineisto?.dokumenttiOid}' tiedostoa ei voitu lisätä liitteeksi`
          );
        }
        (await tiedostot).push(aineistoTiedosto);
        return tiedostot;
      }, Promise.resolve([]))) || [];
    emailToKunnatPDF.attachments = [...pdft, ...paatosTiedostot];
    const sentMessageInfo = await emailClient.sendEmail(emailToKunnatPDF);

    const aikaleima = localDateTimeString();
    julkaisu.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => examineEmailSentResults(kunta, sentMessageInfo, aikaleima));
    julkaisu.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
      examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
    );

    julkaisu.lahetekirje = await saveEmailAsFile(
      projekti.oid,
      new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      emailToKunnatPDF,
      AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE_LAHETEKIRJE
    );

    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(projekti, julkaisu);
  } else {
    log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt viranomaisvastaanottajien sahkopostiosoiteita");
  }
}

export async function sendNahtavillaKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti, "projekti pitää olla olemassa");
  assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  // nahtavilläolokuulutusjulkaisu kyllä löytyy
  const nahtavillakuulutus: NahtavillaoloVaiheJulkaisu | undefined = asiakirjaAdapter.findNahtavillaoloLastApproved(projekti);
  assertIsDefined(nahtavillakuulutus, "Nähtävilläolovaihekuulutuksella ei ole hyväksyttyä julkaisua");

  const emailCreator = await NahtavillaoloEmailCreator.newInstance(projekti, nahtavillakuulutus);

  // aloituskuulutus.muokkaaja on määritelty
  assertIsDefined(nahtavillakuulutus.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(nahtavillakuulutus.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");

  // TODO: tarkista miksi muokkaajaa ei käytetä mihinkään tässä
  const hyvaksyttyEmail = emailCreator.createHyvaksyttyEmail();
  if (hyvaksyttyEmail.to) {
    const pdfPath = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath;
    if (!pdfPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath on määrittelemättä`
      );
    }
    const nahtavillaKuulutusPDF = await getFileAttachment(oid, pdfPath);
    if (!nahtavillaKuulutusPDF) {
      throw new Error("NahtavillaKuulutusPDF:n saaminen epäonnistui");
    }
    hyvaksyttyEmail.attachments = [nahtavillaKuulutusPDF];
    await emailClient.sendEmail(hyvaksyttyEmail);
  } else {
    log.error("NahtavillaKuulutusPDF PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const lahetekirje = await emailCreator.createLahetekirjeWithAttachments();
  const sentMessageInfo = await emailClient.sendEmail(lahetekirje);

  const aikaleima = localDateTimeString();
  nahtavillakuulutus.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => examineEmailSentResults(kunta, sentMessageInfo, aikaleima));
  nahtavillakuulutus.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
    examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
  );

  nahtavillakuulutus.lahetekirje = await saveEmailAsFile(
    projekti.oid,
    new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(nahtavillakuulutus),
    lahetekirje,
    AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE_LAHETEKIRJE
  );

  await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(projekti, nahtavillakuulutus);
}
