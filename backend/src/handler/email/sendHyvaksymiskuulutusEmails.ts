import { projektiDatabase } from "../../database/projektiDatabase";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { AsiakirjaTyyppi, Kayttaja, Kieli, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import Mail from "nodemailer/lib/mailer";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu, HyvaksymisPaatosVaihePDF, KuulutusSaamePDF } from "../../database/model";
import { localDateTimeString } from "../../util/dateUtil";
import { assertIsDefined } from "../../util/assertions";
import { HyvaksymisPaatosEmailCreator } from "../../email/hyvaksymisPaatosEmailCreator";
import { examineEmailSentResults, saveEmailAsFile } from "../../email/emailUtil";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { KuulutusHyvaksyntaEmailSender } from "./KuulutusHyvaksyntaEmailSender";
import {
  findHJatko1KuulutusLastApproved,
  findHJatko2KuulutusLastApproved,
  findHyvaksymisKuulutusLastApproved,
} from "../../projekti/projektiUtil";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { EmailOptions } from "../../email/model/emailOptions";
import { projektiPaallikkoJaVarahenkilotEmails } from "../../email/emailTemplates";
import { getProjektipaallikkoAndOrganisaatio } from "../../util/userUtil";
import { translate } from "../../util/localization";

class HyvaksymisPaatosHyvaksyntaEmailSender extends KuulutusHyvaksyntaEmailSender {
  protected findLastApproved(projekti: DBProjekti) {
    return findHyvaksymisKuulutusLastApproved(projekti);
  }

  protected getPaatosTyyppi() {
    return PaatosTyyppi.HYVAKSYMISPAATOS;
  }

  protected async sendEmailToMaakuntaliitto(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {}

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
      await this.sendEmailToMaakuntaliitto(emailCreator, julkaisu, projektinKielet, projekti);
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
        const pdfKeys: (keyof HyvaksymisPaatosVaihePDF)[] = [
          "ilmoitusHyvaksymispaatoskuulutuksestaPDFPath",
          "ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath",
        ];
        const attachments = await Promise.all(
          pdfKeys.map(async (key) => await this.getMandatoryProjektiFileAsAttachment(pdft[key], projekti, `${key} ${kieli}`))
        );
        (await lahetettavatPDFt).push(...attachments);

        if (projekti.kielitiedot?.toissijainenKieli == Kieli.POHJOISSAAME) {
          const kuulutusIlmoitusPDF = await this.getMandatoryProjektiFileAsAttachment(
            julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusIlmoitusPDF?.tiedosto,
            projekti,
            `kuulutusIlmoitusPDF ${kieli}`
          );
          (await lahetettavatPDFt).push(kuulutusIlmoitusPDF);
        }

        return lahetettavatPDFt;
      }, Promise.resolve([]));
    const paatosTiedostot =
      (await julkaisu.hyvaksymisPaatos?.reduce<Promise<Mail.Attachment[]>>(async (tiedostot, aineisto) => {
        const aineistoTiedosto = await this.getMandatoryProjektiFileAsAttachment(
          aineisto.tiedosto,
          projekti,
          `oid:${aineisto.dokumenttiOid}`
        );
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
          const pdfKeys: (keyof HyvaksymisPaatosVaihePDF)[] = [
            "hyvaksymisKuulutusPDFPath",
            "ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath",
            "hyvaksymisIlmoitusLausunnonantajillePDFPath",
            "hyvaksymisIlmoitusMuistuttajillePDFPath",
          ];
          const attachments = await Promise.all(
            pdfKeys.map(async (key) => await this.getMandatoryProjektiFileAsAttachment(pdft[key], projekti, `${key} ${kieli}`))
          );
          (await lahetettavatPDFt).push(...attachments);
          return lahetettavatPDFt;
        }, Promise.resolve([]));

      if (projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME) {
        const pdfKeys: (keyof KuulutusSaamePDF)[] = ["kuulutusPDF", "kirjeTiedotettavillePDF"];
        const attachments = await Promise.all(
          pdfKeys.map(
            async (key) =>
              await this.getMandatoryProjektiFileAsAttachment(
                julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.[key]?.tiedosto,
                projekti,
                `${key} ${Kieli.POHJOISSAAME}`
              )
          )
        );
        emailToProjektiPaallikko.attachments.push(...attachments);
      }

      await emailClient.sendEmail(emailToProjektiPaallikko);
    } else {
      log.error("Hyväksymiskuulutus PDF:n lahetyksessa ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

class JatkoPaatosHyvaksyntaEmailSender extends HyvaksymisPaatosHyvaksyntaEmailSender {
  protected async sendEmailToMaakuntaliitto(
    emailCreator: HyvaksymisPaatosEmailCreator,
    julkaisu: HyvaksymisPaatosVaiheJulkaisu,
    projektinKielet: Kieli[],
    projekti: DBProjekti
  ): Promise<void> {
    const pdft = await Object.entries(julkaisu.hyvaksymisPaatosVaihePDFt ?? {})
      .filter(([kieli]) => projektinKielet.includes(kieli as Kieli))
      .reduce<Promise<Mail.Attachment[]>>(async (lahetettavatPDFt, [kieli, pdft]) => {
        const pdfKeys: (keyof HyvaksymisPaatosVaihePDF)[] = ["hyvaksymisIlmoitusLausunnonantajillePDFPath"];
        const attachments = await Promise.all(
          pdfKeys.map(async (key) => await this.getMandatoryProjektiFileAsAttachment(pdft[key], projekti, `${key} ${kieli}`))
        );
        (await lahetettavatPDFt).push(...attachments);
        return lahetettavatPDFt;
      }, Promise.resolve([]));
    const paatosTiedostot =
      (await julkaisu.hyvaksymisPaatos?.reduce<Promise<Mail.Attachment[]>>(async (tiedostot, aineisto) => {
        const aineistoTiedosto = await this.getMandatoryProjektiFileAsAttachment(
          aineisto.tiedosto,
          projekti,
          `oid:${aineisto.dokumenttiOid}`
        );
        (await tiedostot).push(aineistoTiedosto);
        return tiedostot;
      }, Promise.resolve([]))) ?? [];
    const virasto =
      projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
        ? "Väyläviraston"
        : translate("ely_alue_genetiivi." + projekti.velho?.suunnittelustaVastaavaViranomainen, Kieli.SUOMI) + " ELY-keskuksen";
    const projektiPaallikko = getProjektipaallikkoAndOrganisaatio(projekti, Kieli.SUOMI);
    const text = `Hei,
Liitteenä on ${virasto} ilmoitus Liikenne- ja viestintävirasto Traficomin tekemästä hyväksymispäätöksen voimassa olon pidentämistä koskevasta päätöksestä koskien suunnitelmaa ${
      projekti.velho?.nimi ?? ""
    }.

Ystävällisin terveisin,
${projektiPaallikko.nimi}
${projektiPaallikko.organisaatio}`;
    const prefix = julkaisu.uudelleenKuulutus ? "Korjaus/uudelleenkuulutus: " + virasto : virasto;
    const emailOptions: EmailOptions = {
      subject: prefix + " kuulutuksesta ilmoittaminen",
      text,
      to: julkaisu.ilmoituksenVastaanottajat?.maakunnat?.map((maakunta) => maakunta.sahkoposti),
      cc: projektiPaallikkoJaVarahenkilotEmails(projekti.kayttoOikeudet),
      attachments: [...pdft, ...paatosTiedostot],
    };
    const sentMessageInfo = await emailClient.sendEmail(emailOptions);
    const aikaleima = localDateTimeString();
    julkaisu.ilmoituksenVastaanottajat?.maakunnat?.map((maakunta) => examineEmailSentResults(maakunta, sentMessageInfo, aikaleima));
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
          const pdfKeys: (keyof HyvaksymisPaatosVaihePDF)[] = [
            "hyvaksymisKuulutusPDFPath",
            "ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath",
            "hyvaksymisIlmoitusLausunnonantajillePDFPath",
          ];
          const attachments = await Promise.all(
            pdfKeys.map(async (key) => await this.getMandatoryProjektiFileAsAttachment(pdft[key], projekti, `${key} ${kieli}`))
          );
          (await lahetettavatPDFt).push(...attachments);
          return lahetettavatPDFt;
        }, Promise.resolve([]));

      if (projekti.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME) {
        const kuulutusPDF = await this.getMandatoryProjektiFileAsAttachment(
          julkaisu.hyvaksymisPaatosVaiheSaamePDFt?.[Kieli.POHJOISSAAME]?.kuulutusPDF?.tiedosto,
          projekti,
          `kuulutusPDF ${Kieli.POHJOISSAAME}`
        );
        emailToProjektiPaallikko.attachments.push(kuulutusPDF);
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
