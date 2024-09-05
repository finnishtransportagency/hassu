import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kayttaja, Kieli } from "hassu-common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { HyvaksymisPaatosEmailCreator } from "../../email/hyvaksymisPaatosEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./HyvaksyntaEmailSender";
import { fileService } from "../../files/fileService";
import {
  findHJatko1KuulutusLastApproved,
  findHJatko2KuulutusLastApproved,
  findHyvaksymisKuulutusLastApproved,
} from "../../projekti/projektiUtil";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

class HyvaksymisPaatosHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  protected findLastApproved(projekti: DBProjekti) {
    return findHyvaksymisKuulutusLastApproved(projekti);
  }

  protected getPaatosTyyppi() {
    return PaatosTyyppi.HYVAKSYMISPAATOS;
  }

  public async sendEmails(oid: string): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti, "projekti pitää olla olemassa");
    const julkaisu = this.findLastApproved(projekti);
    assertIsDefined(julkaisu, "Projektilla ei hyväksyttyä julkaisua");
    const emailCreator = await HyvaksymisPaatosEmailCreator.newInstance(projekti, julkaisu, this.getPaatosTyyppi());

    const projektinKielet = [julkaisu.kielitiedot?.ensisijainenKieli, julkaisu.kielitiedot?.toissijainenKieli].filter(
      (kieli): kieli is Kieli => !!kieli
    );

    await this.sendEmailToMuokkaaja(julkaisu, emailCreator);
    await this.sendEmailToProjektipaallikko(emailCreator, julkaisu, projektinKielet, projekti);
    if (!julkaisu.aineistoMuokkaus) {
      await this.sendEmailToViranomaisille(emailCreator, julkaisu, projektinKielet, projekti);
    }
  }

  protected createEmailOptions(emailCreator: HyvaksymisPaatosEmailCreator) {
    return emailCreator.createHyvaksymispaatosHyvaksyttyViranomaisille();
  }

  protected getProjektiPaths(oid: string, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    return new ProjektiPaths(oid).hyvaksymisPaatosVaihe(julkaisu);
  }

  protected getAsiakirjaTyyppi() {
    return AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE_LAHETEKIRJE;
  }

  protected async updateProjektiJulkaisut(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(projekti, julkaisu);
  }

  private async sendEmailToViranomaisille(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
    const emailToKunnatPDF = this.createEmailOptions(emailCreator);

    if (!emailToKunnatPDF.to) {
      log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt viranomaisvastaanottajien sahkopostiosoiteita");
      return;
    }

    const pdft = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt ?? {})
      .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
      .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
        if (!pdft.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath on määrittelemättä`
          );
        }
        if (!pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath on määrittelemättä`
          );
        }
        const ilmoitusKuulutusPdf = await fileService.getFileAsAttachment(projekti.oid, pdft.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath);
        const ilmoitusKunnallePdf = await fileService.getFileAsAttachment(
          projekti.oid,
          pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath
        );
        if (!ilmoitusKuulutusPdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusKuulutusPdf:ää ei löytynyt kielellä '${kieli}'`);
        }
        if (!ilmoitusKunnallePdf) {
          throw new Error(`sendApprovalMailsAndAttachments: ilmoitusKunnallePdf:ää ei löytynyt kielellä '${kieli}'`);
        }

        (await lahetettavatPDFt).push(ilmoitusKuulutusPdf, ilmoitusKunnallePdf);

        if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
          const pdfIlmoitusSaamePath = julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusIlmoitusPDF?.tiedosto;
          if (!pdfIlmoitusSaamePath) {
            throw new Error(
              `sendApprovalMailsAndAttachments: hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusIlmoitusPDF?.tiedosto on määrittelemättä`
            );
          }
          const hyvaksyttyKuulutusIlmoitusSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfIlmoitusSaamePath);
          if (!hyvaksyttyKuulutusIlmoitusSaamePDF) {
            throw new Error("HyvaksyttyKuulutusIlmoitusSaamePDF:n saaminen epäonnistui");
          }

          (await lahetettavatPDFt).push(hyvaksyttyKuulutusIlmoitusSaamePDF);
        }

        return lahetettavatPDFt;
      }, Promise.resolve([]));
    const paatosTiedostot =
      (await julkaisu.hyvaksymisPaatos?.reduce<Promise<Mail.Attachment[]>>(async (tiedostot, aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error(
            `sendApprovalMailsAndAttachments: Aineiston tunnisteella '${aineisto?.dokumenttiOid}' tiedostopolkua ei ole määritelty`
          );
        }
        const aineistoTiedosto = await fileService.getFileAsAttachment(projekti.oid, aineisto.tiedosto);
        if (!aineistoTiedosto) {
          throw new Error(
            `sendApprovalMailsAndAttachments: Aineiston tunnisteella '${aineisto?.dokumenttiOid}' tiedostoa ei voitu lisätä liitteeksi`
          );
        }
        (await tiedostot).push(aineistoTiedosto);
        return tiedostot;
      }, Promise.resolve([]))) ?? [];
    emailToKunnatPDF.attachments = [...pdft, ...paatosTiedostot];
    const sentMessageInfo = await emailClient.sendEmail(emailToKunnatPDF);

    const aikaleima = localDateTimeString();
    julkaisu.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => examineEmailSentResults(kunta, sentMessageInfo, aikaleima));
    julkaisu.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) =>
      examineEmailSentResults(viranomainen, sentMessageInfo, aikaleima)
    );

    julkaisu.lahetekirje = await saveEmailAsFile(
      projekti.oid,
      this.getProjektiPaths(projekti.oid, julkaisu),
      emailToKunnatPDF,
      this.getAsiakirjaTyyppi()
    );

    await this.updateProjektiJulkaisut(projekti, julkaisu);
  }

  protected async sendEmailToProjektipaallikko(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
    const emailToProjektiPaallikko = emailCreator.createHyvaksyttyEmailPp();
    if (emailToProjektiPaallikko.to) {
      emailToProjektiPaallikko.attachments = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt ?? {})
        .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
        .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
          const kuulutusPdfPath = pdft.hyvaksymisKuulutusPDFPath;
          const ilmoitusPdfPath = pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath;
          const ilmoitusLausunnonAntajallePdfPath = pdft.hyvaksymisIlmoitusLausunnonantajillePDFPath;
          const ilmoitusMuistuttajillePdfPath = pdft.hyvaksymisIlmoitusMuistuttajillePDFPath;

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
          if (!ilmoitusLausunnonAntajallePdfPath) {
            throw new Error(
              `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.hyvaksymisIlmoitusLausunnonantajillePDFPath on määrittelemättä`
            );
          }
          if (!ilmoitusMuistuttajillePdfPath) {
            throw new Error(
              `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.hyvaksymisIlmoitusMuistuttajillePDFPath on määrittelemättä`
            );
          }
          const kuulutusPDF = await fileService.getFileAsAttachment(projekti.oid, kuulutusPdfPath);
          const ilmoitusPdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusPdfPath);
          const ilmoitusLausunnonAntajallePdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusLausunnonAntajallePdfPath);
          const ilmoitusMuistuttajillePdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusMuistuttajillePdfPath);

          if (!kuulutusPDF) {
            throw new Error(`sendApprovalMailsAndAttachments: hyvaksymiskuulutusPDF:ää ei löytynyt kielellä '${kieli}'`);
          }
          if (!ilmoitusPdf) {
            throw new Error(`sendApprovalMailsAndAttachments: ilmoitusPdf:ää ei löytynyt kielellä '${kieli}'`);
          }
          if (!ilmoitusLausunnonAntajallePdf) {
            throw new Error(`sendApprovalMailsAndAttachments: ilmoitusLausunnonAntajallePdf:ää ei löytynyt kielellä '${kieli}'`);
          }
          if (!ilmoitusMuistuttajillePdf) {
            throw new Error(`sendApprovalMailsAndAttachments: ilmoitusMuistuttajillePdf:ää ei löytynyt kielellä '${kieli}'`);
          }
          (await lahetettavatPDFt).push(kuulutusPDF, ilmoitusPdf, ilmoitusLausunnonAntajallePdf, ilmoitusMuistuttajillePdf);
          return lahetettavatPDFt;
        }, Promise.resolve([]));

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const pdfSaamePath = julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto;
        if (!pdfSaamePath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto on määrittelemättä`
          );
        }
        const hyvaksyttyKuulutusSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfSaamePath);
        if (!hyvaksyttyKuulutusSaamePDF) {
          throw new Error("HyvaksyttyKuulutusSaamePDF:n saaminen epäonnistui");
        }
        emailToProjektiPaallikko.attachments.push(hyvaksyttyKuulutusSaamePDF);
      }

      await emailClient.sendEmail(emailToProjektiPaallikko);
    } else {
      log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

class JatkoPaatosHyvaksyntaEmailSender extends HyvaksymisPaatosHyvaksyntaEmailSender {
  protected async sendEmailToProjektipaallikko(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
    const emailToProjektiPaallikko = emailCreator.createHyvaksyttyEmailPp();
    if (emailToProjektiPaallikko.to) {
      emailToProjektiPaallikko.attachments = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt ?? {})
        .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
        .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
          const kuulutusPdfPath = pdft.hyvaksymisKuulutusPDFPath;
          const ilmoitusPdfPath = pdft.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath;
          const ilmoitusLausunnonAntajallePdfPath = pdft.hyvaksymisIlmoitusLausunnonantajillePDFPath;

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
          if (!ilmoitusLausunnonAntajallePdfPath) {
            throw new Error(
              `sendApprovalMailsAndAttachments: julkaisu.hyvaksymisPaatosVaihePDFt?.${kieli}?.hyvaksymisIlmoitusLausunnonantajillePDFPath on määrittelemättä`
            );
          }

          const kuulutusPDF = await fileService.getFileAsAttachment(projekti.oid, kuulutusPdfPath);
          const ilmoitusPdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusPdfPath);
          const ilmoitusLausunnonAntajallePdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusLausunnonAntajallePdfPath);

          if (!kuulutusPDF) {
            throw new Error(`sendApprovalMailsAndAttachments: hyvaksymiskuulutusPDF:ää ei löytynyt kielellä '${kieli}'`);
          }
          if (!ilmoitusPdf) {
            throw new Error(`sendApprovalMailsAndAttachments: ilmoitusPdf:ää ei löytynyt kielellä '${kieli}'`);
          }
          if (!ilmoitusLausunnonAntajallePdf) {
            throw new Error(`sendApprovalMailsAndAttachments: ilmoitusLausunnonAntajallePdf:ää ei löytynyt kielellä '${kieli}'`);
          }

          (await lahetettavatPDFt).push(kuulutusPDF, ilmoitusPdf, ilmoitusLausunnonAntajallePdf);
          return lahetettavatPDFt;
        }, Promise.resolve([]));

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const pdfSaamePath = julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto;
        if (!pdfSaamePath) {
          throw new Error(
            `sendApprovalMailsAndAttachments: hyvaksymisPaatosVaiheJulkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto on määrittelemättä`
          );
        }
        const hyvaksyttyKuulutusSaamePDF = await fileService.getFileAsAttachment(projekti.oid, pdfSaamePath);
        if (!hyvaksyttyKuulutusSaamePDF) {
          throw new Error("HyvaksyttyKuulutusSaamePDF:n saaminen epäonnistui");
        }
        emailToProjektiPaallikko.attachments.push(hyvaksyttyKuulutusSaamePDF);
      }

      await emailClient.sendEmail(emailToProjektiPaallikko);
    } else {
      log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }

  protected async sendEmailToMuokkaaja(julkaisu: HyvaksymisPaatosVaiheJulkaisu, emailCreator: HyvaksymisPaatosEmailCreator) {
    assertIsDefined(julkaisu.muokkaaja, "Julkaisun muokkaaja puuttuu");
    const muokkaaja: Kayttaja | undefined = await this.getKayttaja(julkaisu.muokkaaja);
    assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");
    const jatkopaatosHyvaksyttyEmailMuokkajalle = emailCreator.createHyvaksyttyEmailMuokkaajalle(muokkaaja);
    if (jatkopaatosHyvaksyttyEmailMuokkajalle.to) {
      await emailClient.sendEmail(jatkopaatosHyvaksyttyEmailMuokkajalle);
    } else {
      log.error("Kuulutukselle ei loytynyt laatijan sahkopostiosoitetta");
    }
  }
}

class JatkoPaatos1HyvaksyntaEmailSender extends JatkoPaatosHyvaksyntaEmailSender {
  protected findLastApproved(projekti: DBProjekti) {
    return findHJatko1KuulutusLastApproved(projekti);
  }

  protected getPaatosTyyppi() {
    return PaatosTyyppi.JATKOPAATOS1;
  }

  protected createEmailOptions(emailCreator: HyvaksymisPaatosEmailCreator) {
    return emailCreator.createJatkopaatosHyvaksyttyViranomaisille();
  }

  protected getProjektiPaths(oid: string, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    return new ProjektiPaths(oid).jatkoPaatos1Vaihe(julkaisu);
  }

  protected getAsiakirjaTyyppi() {
    return AsiakirjaTyyppi.JATKOPAATOSKUULUTUS_LAHETEKIRJE;
  }

  protected async updateProjektiJulkaisut(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(projekti, julkaisu);
  }
}

class JatkoPaatos2HyvaksyntaEmailSender extends JatkoPaatosHyvaksyntaEmailSender {
  public findLastApproved(projekti: DBProjekti) {
    return findHJatko2KuulutusLastApproved(projekti);
  }

  protected getPaatosTyyppi() {
    return PaatosTyyppi.JATKOPAATOS2;
  }

  protected createEmailOptions(emailCreator: HyvaksymisPaatosEmailCreator) {
    return emailCreator.createJatkopaatosHyvaksyttyViranomaisille();
  }

  protected getProjektiPaths(oid: string, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    return new ProjektiPaths(oid).jatkoPaatos2Vaihe(julkaisu);
  }

  protected getAsiakirjaTyyppi() {
    return AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2_LAHETEKIRJE;
  }

  protected async updateProjektiJulkaisut(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu) {
    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(projekti, julkaisu);
  }
}

export const hyvaksymisPaatosHyvaksyntaEmailSender = new HyvaksymisPaatosHyvaksyntaEmailSender();
export const jatkoPaatos1HyvaksyntaEmailSender = new JatkoPaatos1HyvaksyntaEmailSender();
export const jatkoPaatos2HyvaksyntaEmailSender = new JatkoPaatos2HyvaksyntaEmailSender();
