import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { AloituskuulutusEmailCreator } from "../../email/aloituskuulutusEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./HyvaksyntaEmailSender";
import { fileService } from "../../files/fileService";
import { findAloitusKuulutusLastApproved } from "../../projekti/projektiUtil";

class AloituskuulutusHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  public async sendEmails(oid: string): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti, "projekti pitää olla olemassa");
    // aloituskuulutusjulkaisu kyllä löytyy
    const aloituskuulutus: AloitusKuulutusJulkaisu | undefined = findAloitusKuulutusLastApproved(projekti);
    assertIsDefined(aloituskuulutus, "Aloituskuulutuksella ei ole hyväksyttyä julkaisua");
    const emailCreator = await AloituskuulutusEmailCreator.newInstance(projekti, aloituskuulutus);

    await this.sendEmailToMuokkaaja(aloituskuulutus, emailCreator);
    await this.sendEmailToProjektipaallikko(emailCreator, aloituskuulutus, projekti);
    await this.sendLahetekirje(emailCreator, aloituskuulutus, projekti);
  }

  private async sendEmailToProjektipaallikko(
    emailCreator: AloituskuulutusEmailCreator,
    aloituskuulutus: AloitusKuulutusJulkaisu,
    projekti: DBProjekti
  ): Promise<void> {
    const aloituskuulutusHyvaksyttyEmail = emailCreator.createHyvaksyttyEmailPp();
    if (aloituskuulutusHyvaksyttyEmail.to) {
      const pdfSuomiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
      if (!pdfSuomiPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
        );
      }
      const aloituskuulutusSuomiPDF = await fileService.getFileAsAttachment(projekti.oid, pdfSuomiPath);
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
        const aloituskuulutusRuotsiPDF = await fileService.getFileAsAttachment(projekti.oid, pdfRuotsiPath);
        if (!aloituskuulutusRuotsiPDF) {
          throw new Error("AloituskuulutusRuotsiPDF:n saaminen epäonnistui");
        }
        aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusRuotsiPDF);
      }

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const pdfSaamePath = aloituskuulutus.aloituskuulutusSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto;
        if (!pdfSaamePath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto on määrittelemättä`
          );
        }
        const aloituskuulutusSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfSaamePath);
        if (!aloituskuulutusSaamePDF) {
          throw new Error("AloituskuulutusSaamePDF:n saaminen epäonnistui");
        }
        aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusSaamePDF);
      }

      await emailClient.sendEmail(aloituskuulutusHyvaksyttyEmail);
    } else {
      log.error("Aloituskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }

  private async sendLahetekirje(
    emailCreator: AloituskuulutusEmailCreator,
    aloituskuulutus: AloitusKuulutusJulkaisu,
    projekti: DBProjekti
  ): Promise<void> {
    const emailOptionsLahetekirje = emailCreator.createLahetekirje();
    if (emailOptionsLahetekirje.to) {
      // PDFt on jo olemassa
      const aloituskuulutusPDFtSUOMI = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI];
      assertIsDefined(aloituskuulutusPDFtSUOMI);
      const aloituskuulutusIlmoitusPDFSUOMI = await fileService.getFileAsAttachment(
        projekti.oid,
        aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath
      );
      if (!aloituskuulutusIlmoitusPDFSUOMI) {
        throw new Error("AloituskuulutusIlmoitusPDFSUOMI:n saaminen epäonnistui");
      }
      let aloituskuulutusIlmoitusPDFRuotsi = undefined;
      let aloituskuulutusIlmoitusPDFPohjoissaame = undefined;

      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        const aloituskuulutusPDFtRuotsi = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI];
        assertIsDefined(aloituskuulutusPDFtRuotsi);
        aloituskuulutusIlmoitusPDFRuotsi = await fileService.getFileAsAttachment(
          projekti.oid,
          aloituskuulutusPDFtRuotsi.aloituskuulutusIlmoitusPDFPath
        );
        if (!aloituskuulutusIlmoitusPDFRuotsi) {
          throw new Error("AloituskuulutusIlmoitusPDFRuotis:n saaminen epäonnistui");
        }
      }
      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.POHJOISSAAME)) {
        const aloituskuulutusPDFtPohjoissaame = aloituskuulutus.aloituskuulutusSaamePDFt?.[Kieli.POHJOISSAAME];
        assertIsDefined(aloituskuulutusPDFtPohjoissaame);
        aloituskuulutusIlmoitusPDFPohjoissaame = await fileService.getFileAsAttachment(
          projekti.oid,
          String(aloituskuulutusPDFtPohjoissaame.kuulutusIlmoitusPDF?.tiedosto)
        );
        if (!aloituskuulutusIlmoitusPDFPohjoissaame) {
          throw new Error("AloituskuulutusIlmoitusPDFPohjoissaame:n saaminen epäonnistui");
        }
      }

      emailOptionsLahetekirje.attachments = [aloituskuulutusIlmoitusPDFSUOMI];
      if (aloituskuulutusIlmoitusPDFRuotsi) {
        emailOptionsLahetekirje.attachments.push(aloituskuulutusIlmoitusPDFRuotsi);
      }
      if (aloituskuulutusIlmoitusPDFPohjoissaame) {
        emailOptionsLahetekirje.attachments.push(aloituskuulutusIlmoitusPDFPohjoissaame);
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
}

export const aloituskuulutusHyvaksyntaEmailSender = new AloituskuulutusHyvaksyntaEmailSender();
