import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kayttaja, Kieli } from "hassu-common/graphql/apiModel";
import { NahtavillaoloVaiheJulkaisu } from "../../database/model";
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

    // aloituskuulutus.muokkaaja on määritelty
    assertIsDefined(nahtavillakuulutus.muokkaaja, "Julkaisun muokkaaja puuttuu");
    const muokkaaja: Kayttaja | undefined = await this.getKayttaja(nahtavillakuulutus.muokkaaja);
    assertIsDefined(muokkaaja, "Muokkaajan käyttäjätiedot puuttuu");

    // TODO: tarkista miksi muokkaajaa ei käytetä mihinkään tässä
    // TODO: Lisää kustomoitu aineistomuokkaus viesti?
    await this.sendEmailToProjektipaallikko(emailCreator, nahtavillakuulutus, oid);

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
    oid: string
  ) {
    const hyvaksyttyEmail = emailCreator.createHyvaksyttyEmail();
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
      await emailClient.sendEmail(hyvaksyttyEmail);
    } else {
      log.error("NahtavillaKuulutusPDF PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

export const nahtavillaoloHyvaksyntaEmailSender = new NahtavillaoloHyvaksyntaEmailSender();
