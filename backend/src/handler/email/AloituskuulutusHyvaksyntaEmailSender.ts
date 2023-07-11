import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kayttaja, Kieli } from "../../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { AloituskuulutusEmailCreator } from "../../email/aloituskuulutusEmailCreator";
import { saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { getKayttaja, getFileAttachment, examineEmailSentResults } from "./emailHandler";
import { KuulutusHyvaksyntaEmailSender } from "./HyvaksyntaEmailSender";

class AloituskuulutusHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  public async sendEmails(oid: string): Promise<void> {
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

    await this.sendEmailToProjektipaallikko(emailCreator, aloituskuulutus, projekti);

    await this.sendLahetekirje(emailCreator, aloituskuulutus, projekti);
  }

  private async sendEmailToProjektipaallikko(
    emailCreator: AloituskuulutusEmailCreator,
    aloituskuulutus: AloitusKuulutusJulkaisu,
    projekti: DBProjekti
  ): Promise<void> {
    const aloituskuulutusHyvaksyttyEmail = emailCreator.createHyvaksyttyEmail();
    if (aloituskuulutusHyvaksyttyEmail.to) {
      const pdfSuomiPath = aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath;
      if (!pdfSuomiPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath on määrittelemättä`
        );
      }
      const aloituskuulutusSuomiPDF = await getFileAttachment(projekti.oid, pdfSuomiPath);
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
        const aloituskuulutusRuotsiPDF = await getFileAttachment(projekti.oid, pdfRuotsiPath);
        if (!aloituskuulutusRuotsiPDF) {
          throw new Error("AloituskuulutusRuotsiPDF:n saaminen epäonnistui");
        }
        aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusRuotsiPDF);
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
      const aloituskuulutusIlmoitusPDFSUOMI = await getFileAttachment(
        projekti.oid,
        aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath
      );
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
          projekti.oid,
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
