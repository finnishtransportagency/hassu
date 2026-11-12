// Contains code generated or recommended by Amazon Q
import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { DBProjekti, NahtavillaoloPDF, NahtavillaoloVaiheJulkaisu, KuulutusSaamePDF } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { NahtavillaoloEmailCreator } from "../../email/nahtavillaoloEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./KuulutusHyvaksyntaEmailSender";
import { findNahtavillaoloLastApproved } from "../../projekti/projektiUtil";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../../database/nahtavillaoloVaiheJulkaisuDatabase";
import { projektiPaallikkoJaVarahenkilotEmails } from "../../email/emailTemplates";
import { getProjektipaallikkoAndOrganisaatio } from "../../util/userUtil";
import { translate } from "../../util/localization";
import { EmailOptions } from "../../email/model/emailOptions";

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

      if (projekti.velho?.tyyppi === ProjektiTyyppi.TOIMINNALLINEN) {
        await this.sendEmailToMaakuntaliitto(nahtavillakuulutus, projekti);
      }
    }

    await nahtavillaoloVaiheJulkaisuDatabase.put(nahtavillakuulutus);
  }

  private async sendEmailToMaakuntaliitto(nahtavillakuulutus: NahtavillaoloVaiheJulkaisu, projekti: DBProjekti): Promise<void> {
    const maakunnat = nahtavillakuulutus.ilmoituksenVastaanottajat?.maakunnat;
    if (!maakunnat?.length) {
      log.info("Nähtävilläolokuulutus: ei maakuntaliittovastaanottajia, ohitetaan maakuntaliittoilmoitus");
      return;
    }
    const viranomainen = projekti.velho?.suunnittelustaVastaavaViranomainen;
    const virasto =
      viranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
        ? "Väyläviraston"
        : viranomainen && viranomainen.endsWith("ELY")
        ? translate("ely_alue_genetiivi." + viranomainen, Kieli.SUOMI) + " ELY-keskuksen"
        : translate("ely_alue_genetiivi." + viranomainen, Kieli.SUOMI) + " elinvoimakeskuksen";
    const projektiPaallikko = getProjektipaallikkoAndOrganisaatio(projekti, Kieli.SUOMI);
    const prefix = nahtavillakuulutus.uudelleenKuulutus ? "Korjaus/uudelleenkuulutus: " + virasto : virasto;
    const ensisijainenKieli = nahtavillakuulutus.kielitiedot.ensisijainenKieli;
    const maakuntaliiottoPDFPath = nahtavillakuulutus.nahtavillaoloPDFt?.[ensisijainenKieli]?.nahtavillaoloIlmoitusMaakuntaliitoillePDFPath;
    assertIsDefined(maakuntaliiottoPDFPath, `nahtavillaoloIlmoitusMaakuntaliitoillePDFPath ${ensisijainenKieli} puuttuu`);
    const ilmoitusPDF = await this.getMandatoryProjektiFileAsAttachment(
      maakuntaliiottoPDFPath,
      projekti,
      `nahtavillaoloIlmoitusMaakuntaliitoillePDFPath ${ensisijainenKieli}`
    );
    const emailOptions: EmailOptions = {
      subject: prefix + " kuulutuksesta ilmoittaminen",
      text: `Hei,\nLiitteenä on ${virasto} ilmoitus nähtävilläolokuulutuksesta koskien suunnitelmaa ${
        projekti.velho?.nimi ?? ""
      }.\n\nYstävällisin terveisin,\n${projektiPaallikko.nimi}\n${projektiPaallikko.organisaatio}`,
      to: maakunnat.map((maakunta) => maakunta.sahkoposti),
      cc: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
      attachments: [ilmoitusPDF],
    };
    const sentMessageInfo = await emailClient.sendEmail(emailOptions);
    const aikaleima = localDateTimeString();
    maakunnat.map((maakunta) => examineEmailSentResults(maakunta, sentMessageInfo, aikaleima));
  }

  private async sendEmailToProjektipaallikko(
    emailCreator: NahtavillaoloEmailCreator,
    nahtavillakuulutus: NahtavillaoloVaiheJulkaisu,
    oid: string,
    projekti: DBProjekti
  ) {
    const hyvaksyttyEmail = emailCreator.createHyvaksyttyEmailPp();
    if (hyvaksyttyEmail.to) {
      const isToiminnallinen = projekti.velho?.tyyppi === ProjektiTyyppi.TOIMINNALLINEN;
      const pdfKeys: (keyof NahtavillaoloPDF)[] = isToiminnallinen
        ? ["nahtavillaoloPDFPath"]
        : ["nahtavillaoloPDFPath", "nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath"];

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
        const saamePdfKeys: (keyof KuulutusSaamePDF)[] = ["kuulutusPDF", "kirjeTiedotettavillePDF"];
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
