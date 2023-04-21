import { projektiDatabase } from "../database/projektiDatabase";
import { emailClient } from "../email/email";
import {
  createAloituskuulutusHyvaksyttavanaEmail,
  createAloituskuulutusHyvaksyttyEmail,
  createAloituskuulutusHyvaksyttyPDFEmail,
  createHyvaksymispaatosHyvaksyttyLaatijalleEmail,
  createHyvaksymispaatosHyvaksyttyPaallikkolleEmail,
  createHyvaksymispaatosHyvaksyttyViranomaisilleEmail,
  createNahtavillaoloVaiheKuulutusHyvaksyttyPDFEmail,
} from "../email/emailTemplates";
import { log } from "../logger";
import { personSearch } from "../personSearch/personSearchClient";
import { Kayttaja, Kieli, LaskuriTyyppi } from "../../../common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { AloitusKuulutusJulkaisu, DBProjekti, NahtavillaoloVaiheJulkaisu, SahkopostiVastaanottaja } from "../database/model";
import { createAloituskuulutusLahetekirjeEmail, createNahtavillaLahetekirjeEmail } from "../email/lahetekirje/lahetekirjeEmailTemplate";
import { config } from "../config";
import { Readable } from "stream";
import { localDateTimeString } from "../util/dateUtil";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import { getS3 } from "../aws/client";
import { assertIsDefined } from "../util/assertions";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { AloituskuulutusKutsuAdapter } from "../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import {
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
  HyvaksymisPaatosVaiheKutsuAdapter,
} from "../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { pickCommonAdapterProps } from "../asiakirja/adapter/commonKutsuAdapter";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { NahtavillaoloVaiheKutsuAdapter } from "../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";

export async function getFileAttachment(oid: string, key: string): Promise<Mail.Attachment | undefined> {
  log.info("haetaan s3:sta sähköpostiin liitetiedosto", { key });

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
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu. Muokkaaja:" + muokkaaja);
  const emailOptionsMuokkaaja = createAloituskuulutusHyvaksyttyEmail(adapter, muokkaaja);
  if (emailOptionsMuokkaaja.to) {
    await emailClient.sendEmail(emailOptionsMuokkaaja);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt aloituskuulutuksen laatijan sahkopostiosoitetta");
  }

  const emailOptionsPDF = createAloituskuulutusHyvaksyttyPDFEmail(adapter);
  if (emailOptionsPDF.to) {
    const pdfSuomiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
    if (!pdfSuomiPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
      );
    }
    const aloituskuulutusSuomiPDF = await getFileAttachment(adapter.oid, pdfSuomiPath);
    if (!aloituskuulutusSuomiPDF) {
      throw new Error("AloituskuulutusSuomiPDF:n saaminen epäonnistui");
    }
    emailOptionsPDF.attachments = [aloituskuulutusSuomiPDF];

    if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
      const pdfRuotsiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusPDFPath;
      if (!pdfRuotsiPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusPDFPath on määrittelemättä`
        );
      }
      const aloituskuulutusRuotsiPDF = await getFileAttachment(adapter.oid, pdfRuotsiPath);
      if (!aloituskuulutusRuotsiPDF) {
        throw new Error("AloituskuulutusRuotsiPDF:n saaminen epäonnistui");
      }
      emailOptionsPDF.attachments.push(aloituskuulutusRuotsiPDF);
    }

    await emailClient.sendEmail(emailOptionsPDF);
  } else {
    log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = createAloituskuulutusLahetekirjeEmail(adapter);
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
      : undefined;
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

export async function sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti, "projekti pitää olla olemassa");
  assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
  const julkaisu = asiakirjaAdapter.findHyvaksymisKuulutusLastApproved(projekti);
  assertIsDefined(julkaisu, "Projektilla ei hyväksyttyä julkaisua");
  assertIsDefined(julkaisu.kuulutusPaiva);
  const adapter = new HyvaksymisPaatosVaiheKutsuAdapter(
    createHyvaksymisPaatosVaiheKutsuAdapterProps(
      projekti.oid,
      projekti.lyhytOsoite,
      projekti.kayttoOikeudet,
      Kieli.SUOMI,
      julkaisu,
      projekti.kasittelynTila
    )
  );
  assertIsDefined(julkaisu.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(julkaisu.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");
  const emailOptionsMuokkaaja = createHyvaksymispaatosHyvaksyttyLaatijalleEmail(adapter, muokkaaja);
  if (emailOptionsMuokkaaja.to) {
    await emailClient.sendEmail(emailOptionsMuokkaaja);
  } else {
    log.error("Kuulutukselle ei loytynyt laatijan sahkopostiosoitetta");
  }

  const projektinKielet = [julkaisu.kielitiedot?.ensisijainenKieli, julkaisu.kielitiedot?.toissijainenKieli].filter(
    (kieli): kieli is Kieli => !!kieli
  );

  const emailToProjektiPaallikko = createHyvaksymispaatosHyvaksyttyPaallikkolleEmail(adapter);
  if (emailToProjektiPaallikko.to) {
    const pdft = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt || {})
      .filter(([kieli]) => !!projektinKielet.includes(kieli as Kieli))
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
        const kuulutusPDF = await getFileAttachment(adapter.oid, kuulutusPdfPath);
        const ilmoitusPdf = await getFileAttachment(adapter.oid, ilmoitusPdfPath);
        if (!kuulutusPDF) {
          throw new Error(`sendApprovalMailsAndAttachments: hyvaksymiskuulutusPDF:ää ei löytynyt kielellä '${kieli}'`);
        }
        if (!ilmoitusPdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusPdf:ää ei löytynyt kielellä '${kieli}'`);
        }
        (await lahetettavatPDFt).push(kuulutusPDF, ilmoitusPdf);
        return lahetettavatPDFt;
      }, Promise.resolve([]));
    emailToProjektiPaallikko.attachments = pdft;
    await emailClient.sendEmail(emailToProjektiPaallikko);
  } else {
    log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailToKunnatPDF = createHyvaksymispaatosHyvaksyttyViranomaisilleEmail(adapter);
  if (emailToKunnatPDF.to) {
    const pdft = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt || {})
      .filter(([kieli]) => !!projektinKielet.includes(kieli as Kieli))
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
        const ilmoitusKuulutusPdf = await getFileAttachment(adapter.oid, ilmoitusKuulutusPdfPath);
        const ilmoitusKunnallePdf = await getFileAttachment(adapter.oid, ilmoitusKunnallePdfPath);
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
        const aineistoTiedosto = await getFileAttachment(adapter.oid, aineisto.tiedosto);
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
  assertIsDefined(nahtavillakuulutus.kuulutusPaiva);
  assertIsDefined(nahtavillakuulutus.hankkeenKuvaus);
  const adapter = new NahtavillaoloVaiheKutsuAdapter({
    ...pickCommonAdapterProps(projekti, nahtavillakuulutus.hankkeenKuvaus, Kieli.SUOMI),
    ...nahtavillakuulutus,
    kuulutusPaiva: nahtavillakuulutus.kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: await calculateEndDate({
      alkupaiva: nahtavillakuulutus.kuulutusPaiva,
      tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
    }),
    kirjaamoOsoitteet: [],
  });
  // aloituskuulutus.muokkaaja on määritelty
  assertIsDefined(nahtavillakuulutus.muokkaaja, "Julkaisun muokkaaja puuttuu");
  const muokkaaja: Kayttaja | undefined = await getKayttaja(nahtavillakuulutus.muokkaaja);
  assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");

  const emailOptionsPDF = createNahtavillaoloVaiheKuulutusHyvaksyttyPDFEmail(adapter);
  if (emailOptionsPDF.to) {
    const pdfPath = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath;
    if (!pdfPath) {
      throw new Error(
        `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath on määrittelemättä`
      );
    }
    const nahtavillaKuulutusPDF = await getFileAttachment(adapter.oid, pdfPath);
    if (!nahtavillaKuulutusPDF) {
      throw new Error("NahtavillaKuulutusPDF:n saaminen epäonnistui");
    }
    emailOptionsPDF.attachments = [nahtavillaKuulutusPDF];
    await emailClient.sendEmail(emailOptionsPDF);
  } else {
    log.error("NahtavillaKuulutusPDF PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
  }

  const emailOptionsLahetekirje = createNahtavillaLahetekirjeEmail(adapter);
  if (emailOptionsLahetekirje.to) {
    // PDFt on jo olemassa
    const nahtavillakuulutusPDFtSUOMI = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI];
    assertIsDefined(nahtavillakuulutusPDFtSUOMI);
    const nahtavillakuulutusIlmoitusPDFSUOMI = await getFileAttachment(
      adapter.oid,
      nahtavillakuulutusPDFtSUOMI.nahtavillaoloIlmoitusPDFPath
    );
    if (!nahtavillakuulutusIlmoitusPDFSUOMI) {
      throw new Error("NahtavillaKuulutusPDF SUOMI:n saaminen epäonnistui");
    }
    let nahtavillakuulutusIlmoitusPDFToinenKieli = undefined;
    const toinenKieli = [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
      ? Kieli.RUOTSI
      : undefined;
    if (toinenKieli) {
      const nahtavillakuulutusPDFtToinenKieli = nahtavillakuulutus.nahtavillaoloPDFt?.[toinenKieli];
      assertIsDefined(nahtavillakuulutusPDFtToinenKieli);
      nahtavillakuulutusIlmoitusPDFToinenKieli = await getFileAttachment(
        adapter.oid,
        nahtavillakuulutusPDFtToinenKieli.nahtavillaoloIlmoitusPDFPath
      );
      if (!nahtavillakuulutusIlmoitusPDFToinenKieli) {
        throw new Error("NahtavillaKuulutusPDFToinenKieli:n saaminen epäonnistui");
      }
    }

    emailOptionsLahetekirje.attachments = [nahtavillakuulutusIlmoitusPDFSUOMI];
    if (nahtavillakuulutusIlmoitusPDFToinenKieli) {
      emailOptionsLahetekirje.attachments.push(nahtavillakuulutusIlmoitusPDFToinenKieli);
    }
    const sentMessageInfo = await emailClient.sendEmail(emailOptionsLahetekirje);

    const aikaleima = localDateTimeString();
    nahtavillakuulutus.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => examineEmailSentResults(kunta, sentMessageInfo, aikaleima));
    nahtavillakuulutus.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
      examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
    );
    await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(projekti, nahtavillakuulutus);
  } else {
    log.error("Ilmoitus nahtavillakuulutuksesta sahkopostin vastaanottajia ei loytynyt");
  }
}
