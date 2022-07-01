import { DBProjekti, Muistutus } from "../database/model";
import { emailClient } from "../email/email";
import { createMuistutusKirjaamolleEmail } from "../email/emailTemplates";
import { getFileAttachment } from "../handler/emailHandler";
import { kirjaamoOsoitteetService } from "../kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { log } from "../logger";

class MuistutusEmailService {
  async sendEmailToKirjaamo(projekti: DBProjekti, muistutus: Muistutus) {
    const vastaavaViranomainen = projekti.velho.suunnittelustaVastaavaViranomainen;
    const kirjaamot = await kirjaamoOsoitteetService.listKirjaamoOsoitteet();
    // Meilla on kahden tyyppista Viranomais -enumia, jotka eivat ole kuitenkaan taysin yhtenaisia kattavuudeltaan
    // mutta string arvoiltaan ovat samoja, silloin kun viranomainen molemmista loytyy
    const sahkoposti = kirjaamot.find(({ nimi }) => nimi.toString() === vastaavaViranomainen.toString())?.sahkoposti;
    console.log("Muistutuksen vastaanottaja: ", sahkoposti);
    if(!sahkoposti){
      //TODO
      console.log("kirjaamon sähköpostiosoitetta ei löytynyt");
    }

    const emailOptions = createMuistutusKirjaamolleEmail(projekti, muistutus, sahkoposti);

    if (muistutus.liite) {
      log.info("haetaan muistutuksen liite: ", muistutus.liite);
      const liite = await getFileAttachment(projekti.oid, muistutus.liite);
      emailOptions.attachments = [liite];
      emailOptions.text.toString().concat(`
      
      Muistutukseen on lisätty liite`);
    } else {
      emailOptions.text.toString().concat(`
      
      Muistutukseen ei ole lisätty liitettä`);
    }

    await emailClient.sendEmail(emailOptions);
    log.info("Muistutuksen sisältävä sähköposti lähetetty: " + emailOptions.to);
  }
}

export const muistutusEmailService = new MuistutusEmailService();
