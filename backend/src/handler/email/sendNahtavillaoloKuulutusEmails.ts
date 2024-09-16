import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import { DBProjekti, NahtavillaoloPDF, NahtavillaoloVaiheJulkaisu, TiedotettavaKuulutusSaamePDF } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { NahtavillaoloEmailCreator } from "../../email/nahtavillaoloEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./KuulutusHyvaksyntaEmailSender";
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
      const pdfKeys: (keyof NahtavillaoloPDF)[] = ["nahtavillaoloPDFPath", "nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath"];

      hyvaksyttyEmail.attachments = await Promise.all(
        pdfKeys.map(
          async (key) =>
            await this.getMandatoryProjektiFileAsAttachment(nahtavillakuulutus.nahtavillaoloPDFt?.SUOMI?.[key], projekti, `${key} SUOMI`)
        )
      );

      if ([projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)) {
        const attachments = await Promise.all(
          pdfKeys.map(
            async (key) =>
              await this.getMandatoryProjektiFileAsAttachment(
                nahtavillakuulutus.nahtavillaoloPDFt?.RUOTSI?.[key],
                projekti,
                `${key} RUOTSI`
              )
          )
        );
        hyvaksyttyEmail.attachments.push(...attachments);
      }

      if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
        const saamePdfKeys: (keyof TiedotettavaKuulutusSaamePDF)[] = ["kuulutusPDF", "kirjeTiedotettavillePDF"];
        const attachments = await Promise.all(
          saamePdfKeys.map(
            async (key) =>
              await this.getMandatoryProjektiFileAsAttachment(
                nahtavillakuulutus.nahtavillaoloSaamePDFt?.[Kieli.POHJOISSAAME]?.[key]?.tiedosto,
                projekti,
                `${key} POHJOISSAAME`
              )
          )
        );
        hyvaksyttyEmail.attachments.push(...attachments);
      }

      await emailClient.sendEmail(hyvaksyttyEmail);
    } else {
      log.error("NahtavillaKuulutusPDF PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

export const nahtavillaoloHyvaksyntaEmailSender = new NahtavillaoloHyvaksyntaEmailSender();
