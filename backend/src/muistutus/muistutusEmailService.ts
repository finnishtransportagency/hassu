import { DBProjekti, Muistutus } from "../database/model";
import { emailClient } from "../email/email";
import { createMuistutusKirjaamolleEmail } from "../email/emailTemplates";
import { getFileAttachment } from "../handler/emailHandler";
import { log } from "../logger";

class MuistutusEmailService {
  async sendEmailToKirjaamo(projekti: DBProjekti, muistutus: Muistutus) {
    const emailOptions = createMuistutusKirjaamolleEmail(projekti);

    //TODO: muistutusteksti mukaan

    if (muistutus.liite) {
      log.info("haetaan muistutuksen liite: ", muistutus.liite);
      const liite = await getFileAttachment(projekti.oid, muistutus.liite);
      emailOptions.attachments = [liite];
    }

    await emailClient.sendEmail(emailOptions);
    log.info("Muistutuksen sisältävä sähköposti lähetetty: " + emailOptions.to);
  }
}

export const muistutusEmailService = new MuistutusEmailService();
