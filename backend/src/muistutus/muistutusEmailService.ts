import { DBProjekti, Muistutus } from "../database/model";
import { emailClient } from "../email/email";
import { createMuistutusKirjaamolleEmail, createKuittausMuistuttajalleEmail } from "../email/emailTemplates";
import { getFileAttachment } from "../handler/emailHandler";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { log } from "../logger";

class MuistutusEmailService {
  async sendEmailToMuistuttaja(projekti: DBProjekti, muistutus: Muistutus) {
    log.info("Lähetetään kuittaus muistutuksen tekijälle");
    const emailOptions = createKuittausMuistuttajalleEmail(projekti, muistutus);
    await emailClient.sendEmail(emailOptions);
    log.info("Kuittaus muistuttajalle lähetetty: " + emailOptions.to);
  }

  async sendEmailToKirjaamo(projekti: DBProjekti, muistutus: Muistutus) {
    if (!projekti.velho) {
      throw new Error("projekti.velho ei määritelty");
    }
    if (!projekti.velho.suunnittelustaVastaavaViranomainen) {
      throw new Error("projekti.velho.suunnittelustaVastaavaViranomainen ei määritelty");
    }
    const vastaavaViranomainen = projekti.velho.suunnittelustaVastaavaViranomainen;
    const kirjaamot = await kirjaamoOsoitteetService.listKirjaamoOsoitteet();
    // Hassussa on kahden tyyppista Viranomais -enumia, jotka eivat ole kuitenkaan taysin yhtenaisia kattavuudeltaan
    // mutta string arvoiltaan ovat samoja, silloin kun viranomainen molemmista loytyy
    const sahkoposti = kirjaamot.find(({ nimi }) => nimi.toString() === vastaavaViranomainen.toString())?.sahkoposti;
    log.info("Muistutuksen vastaanottaja: ", sahkoposti);
    if (!sahkoposti) {
      log.error("Vastaavan viranomaisen kirjaamon sähköpostiosoitetta ei löytynyt", vastaavaViranomainen);
      throw new Error("Muistutusta ei voitu lähettää kirjaamoon, syy: kirjaamon osoitetta ei löytynyt");
    }

    const emailOptions = createMuistutusKirjaamolleEmail(projekti, muistutus, sahkoposti);

    if (muistutus.liite) {
      log.info("haetaan muistutuksen liite: ", muistutus.liite);
      const liite = await getFileAttachment(projekti.oid, muistutus.liite);
      if (!liite) {
        throw new Error("Liitetiedostoa ei saatu");
      }
      emailOptions.attachments = [liite];
      emailOptions.text = (emailOptions.text || "").toString().concat(`
      
      Muistutukseen on lisätty liite`);
    } else {
      emailOptions.text = (emailOptions.text || "").toString().concat(`
      
      Muistutukseen ei ole lisätty liitettä`);
    }

    await emailClient.sendEmail(emailOptions);
    log.info("Muistutuksen sisältävä sähköposti lähetetty: " + emailOptions.to);
  }
}

export const muistutusEmailService = new MuistutusEmailService();
