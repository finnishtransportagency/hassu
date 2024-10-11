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
import { KuulutusHyvaksyntaEmailSender } from "./KuulutusHyvaksyntaEmailSender";
import { findAloitusKuulutusLastApproved } from "../../projekti/projektiUtil";

const saamet = [Kieli.POHJOISSAAME];

type SaameLanguage = Kieli.POHJOISSAAME;

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
      const aloituskuulutusSuomiPDF = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
        aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusPDFPath,
        projekti,
        `aloituskuulutusPDFPath SUOMI`
      );
      aloituskuulutusHyvaksyttyEmail.attachments = [aloituskuulutusSuomiPDF.attachment];

      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        const aloituskuulutusRuotsiPDF = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
          aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusPDFPath,
          projekti,
          `aloituskuulutusPDFPath RUOTSI`
        );
        aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusRuotsiPDF.attachment);
      }

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const aloituskuulutusSaamePDF = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
          aloituskuulutus.aloituskuulutusSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto,
          projekti,
          `aloituskuulutusSaamePDFt.POHJOISSAAME.kuulutusPDF`
        );
        aloituskuulutusHyvaksyttyEmail.attachments.push(aloituskuulutusSaamePDF.attachment);
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
      const aloituskuulutusIlmoitusPDFSUOMI = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
        aloituskuulutus.aloituskuulutusPDFt?.[Kieli.SUOMI]?.aloituskuulutusIlmoitusPDFPath,
        projekti,
        `aloituskuulutusPDFtSUOMI.aloituskuulutusIlmoitusPDFPath`
      );
      emailOptionsLahetekirje.attachments = [aloituskuulutusIlmoitusPDFSUOMI.attachment];

      const projectLanguages = [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli];

      if (projectLanguages.includes(Kieli.RUOTSI)) {
        const aloituskuulutusIlmoitusPDFRuotsi = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
          aloituskuulutus.aloituskuulutusPDFt?.[Kieli.RUOTSI]?.aloituskuulutusIlmoitusPDFPath,
          projekti,
          `aloituskuulutusPDFtRUOTSI.aloituskuulutusIlmoitusPDFPath`
        );
        emailOptionsLahetekirje.attachments.push(aloituskuulutusIlmoitusPDFRuotsi.attachment);
      }

      const saameLanguages = projectLanguages.filter(
        (language) => language !== undefined && language !== null && saamet.includes(language)
      ) as SaameLanguage[];

      if (saameLanguages) {
        for (const saameLanguage of saameLanguages) {
          const kuulutusIlmoitusPDF = await this.getMandatoryProjektiFileAsAttachmentAndItsSize(
            aloituskuulutus.aloituskuulutusSaamePDFt?.[saameLanguage]?.kuulutusIlmoitusPDF?.tiedosto,
            projekti,
            `aloituskuulutusSaamePDFt.${saameLanguage}.kuulutusIlmoitusPDF`
          );
          emailOptionsLahetekirje.attachments.push(kuulutusIlmoitusPDF.attachment);
        }
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
