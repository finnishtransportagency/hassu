import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kayttaja, Kieli } from "hassu-common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { HyvaksymisPaatosEmailCreator } from "../../email/hyvaksymisPaatosEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./HyvaksyntaEmailSender";
import { fileService } from "../../files/fileService";

class HyvaksymisPaatosHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  public async sendEmails(oid: string): Promise<void> {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti, "projekti pitää olla olemassa");
    const julkaisu = asiakirjaAdapter.findHyvaksymisKuulutusLastApproved(projekti);
    assertIsDefined(julkaisu, "Projektilla ei hyväksyttyä julkaisua");
    const emailCreator = await HyvaksymisPaatosEmailCreator.newInstance(projekti, julkaisu);

    assertIsDefined(julkaisu.muokkaaja, "Julkaisun muokkaaja puuttuu");
    const muokkaaja: Kayttaja | undefined = await this.getKayttaja(julkaisu.muokkaaja);
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

    await this.sendEmailToProjektipaallikko(emailCreator, julkaisu, projektinKielet, projekti);
    await this.sendEmailToViranomaisille(emailCreator, julkaisu, projektinKielet, projekti);
  }

  private async sendEmailToViranomaisille(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
    const emailToKunnatPDF = emailCreator.createHyvaksymispaatosHyvaksyttyViranomaisille();

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
  }

  private async sendEmailToProjektipaallikko(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
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
          const kuulutusPDF = await fileService.getFileAsAttachment(projekti.oid, kuulutusPdfPath);
          const ilmoitusPdf = await fileService.getFileAsAttachment(projekti.oid, ilmoitusPdfPath);
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
  }
}

export const hyvaksymisPaatosHyvaksyntaEmailSender = new HyvaksymisPaatosHyvaksyntaEmailSender();
