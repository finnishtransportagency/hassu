import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { NahtavillaoloEmailCreator } from "../../email/nahtavillaoloEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./HyvaksyntaEmailSender";
import { fileService } from "../../files/fileService";
import { findNahtavillaoloLastApproved } from "../../projekti/projektiUtil";

class NahtavillaoloHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  public async sendEmails(oid: string): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti, "projekti pitää olla olemassa");
    assertIsDefined(projekti.kayttoOikeudet, "kayttoOikeudet pitää olla annettu");
    // nahtavilläolokuulutusjulkaisu kyllä löytyy
    const nahtavillakuulutus: NahtavillaoloVaiheJulkaisu | undefined = findNahtavillaoloLastApproved(projekti);
    assertIsDefined(nahtavillakuulutus, "Nähtävilläolovaihekuulutuksella ei ole hyväksyttyä julkaisua");

    const emailCreator = await NahtavillaoloEmailCreator.newInstance(projekti, nahtavillakuulutus);

    await this.sendEmailToMuokkaaja(nahtavillakuulutus, emailCreator);
    await this.sendEmailToProjektipaallikko(emailCreator, nahtavillakuulutus, oid, projekti);

    if (!nahtavillakuulutus.aineistoMuokkaus) {
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
    }

    await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(projekti, nahtavillakuulutus);
  }

  private async sendEmailToProjektipaallikko(
    emailCreator: NahtavillaoloEmailCreator,
    nahtavillakuulutus: NahtavillaoloVaiheJulkaisu,
    oid: string,
    projekti: DBProjekti
  ) {
    const hyvaksyttyEmail = emailCreator.createHyvaksyttyEmailPp();
    if (hyvaksyttyEmail.to) {
      const pdfPath = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath;
      if (!pdfPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloPDFPath on määrittelemättä`
        );
      }
      const nahtavillaKuulutusPDF = await fileService.getFileAsAttachment(oid, pdfPath);
      if (!nahtavillaKuulutusPDF) {
        throw new Error("NahtavillaKuulutusPDF:n saaminen epäonnistui");
      }
      hyvaksyttyEmail.attachments = [nahtavillaKuulutusPDF];

      const kiinteistoPdfPath = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
      if (!kiinteistoPdfPath) {
        throw new Error(
          `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.SUOMI]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath on määrittelemättä`
        );
      }
      const nahtavillaKiinteistoPDF = await fileService.getFileAsAttachment(oid, kiinteistoPdfPath);
      if (!nahtavillaKiinteistoPDF) {
        throw new Error("NahtavillaKiinteistoPDF:n saaminen epäonnistui");
      }
      hyvaksyttyEmail.attachments.push(nahtavillaKiinteistoPDF);

      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        const pdfPathRuotsi = nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.RUOTSI]?.nahtavillaoloPDFPath;
        if (!pdfPathRuotsi) {
          throw new Error(
            `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.RUOTSI]?.nahtavillaoloPDFPath on määrittelemättä`
          );
        }
        const nahtavillaKuulutusPDFRuotsi = await fileService.getFileAsAttachment(oid, pdfPathRuotsi);
        if (!nahtavillaKuulutusPDFRuotsi) {
          throw new Error("NahtavillaKuulutusPDF:n saaminen epäonnistui");
        }
        hyvaksyttyEmail.attachments.push(nahtavillaKuulutusPDFRuotsi);

        const kiinteistoPdfPathRuotsi =
          nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.RUOTSI]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
        if (!kiinteistoPdfPathRuotsi) {
          throw new Error(
            `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloPDFt?.[Kieli.RUOTSI]?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath on määrittelemättä`
          );
        }
        const nahtavillaKiinteistoPDFRuotsi = await fileService.getFileAsAttachment(oid, kiinteistoPdfPathRuotsi);
        if (!nahtavillaKiinteistoPDFRuotsi) {
          throw new Error("NahtavillaKiinteistoPDFRuotsi:n saaminen epäonnistui");
        }
        hyvaksyttyEmail.attachments.push(nahtavillaKiinteistoPDFRuotsi);
      }

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const pdfSaamePath = nahtavillakuulutus.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto;
        if (!pdfSaamePath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto on määrittelemättä`
          );
        }
        const nahtavillaKuulutusSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfSaamePath);
        if (!nahtavillaKuulutusSaamePDF) {
          throw new Error("NahtavillaKuulutusSaamePDF:n saaminen epäonnistui");
        }
        hyvaksyttyEmail.attachments.push(nahtavillaKuulutusSaamePDF);

        const pdfSaameTiedotettavaKirjePath =
          nahtavillakuulutus.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.kirjeTiedotettavillePDF?.tiedosto;
        if (!pdfSaameTiedotettavaKirjePath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: nahtavillakuulutus.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.kirjeTiedotettavillePDF?.tiedosto on määrittelemättä`
          );
        }
        const kirjeTiedotettavilleSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfSaameTiedotettavaKirjePath);
        if (!kirjeTiedotettavilleSaamePDF) {
          throw new Error("kirjeTiedotettavilleSaamePDF:n saaminen epäonnistui");
        }
        hyvaksyttyEmail.attachments.push(kirjeTiedotettavilleSaamePDF);
      }

      await emailClient.sendEmail(hyvaksyttyEmail);
    } else {
      log.error("NahtavillaKuulutusPDF PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

export const nahtavillaoloHyvaksyntaEmailSender = new NahtavillaoloHyvaksyntaEmailSender();
