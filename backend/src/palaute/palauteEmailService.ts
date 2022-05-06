import { projektiDatabase } from "../database/projektiDatabase";
import { DBProjekti } from "../database/model/projekti";
import { createNewFeedbackAvailableEmail } from "../email/emailTemplates";
import { emailClient } from "../email/email";
import { log } from "../logger";

class PalauteEmailService {
  async sendEmailsToPalautteidenVastaanottajat(projekti: DBProjekti) {
    if (projekti.suunnitteluVaihe.palautteidenVastaanottajat) {
      for (const username of projekti.suunnitteluVaihe.palautteidenVastaanottajat) {
        const recipient = projekti.kayttoOikeudet.find((user) => user.kayttajatunnus == username);
        if (recipient) {
          const emailOptions = createNewFeedbackAvailableEmail(projekti.oid, recipient.email);
          if (emailOptions.to) {
            await emailClient.sendEmail(emailOptions);
            log.info("'Uusia palautteita'-email lähetetty: " + emailOptions.to);
          }
        }
      }
    }
  }

  async sendNewFeedbackDigest(): Promise<void> {
    const oids = await projektiDatabase.findProjektiOidsWithNewFeedback();
    log.info("Projekteja, joissa uusia palautteita " + oids.length + " kpl.");
    for (const oid of oids) {
      const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);

      let recipients;
      // Send digest email to everybody else than the ones listed in palautteidenVastaanottajat. They already got the emails immediately when feedback was given
      if (dbProjekti.suunnitteluVaihe.palautteidenVastaanottajat) {
        recipients = dbProjekti.kayttoOikeudet.filter(
          (user) => dbProjekti.suunnitteluVaihe.palautteidenVastaanottajat.indexOf(user.kayttajatunnus) < 0
        );
      } else {
        recipients = dbProjekti.kayttoOikeudet;
      }
      for (const recipient of recipients) {
        const emailOptions = createNewFeedbackAvailableEmail(dbProjekti.oid, recipient.email);
        if (emailOptions.to) {
          await emailClient.sendEmail(emailOptions);
          log.info("'Uusia palautteita'-email lähetetty: " + emailOptions.to);
        }
      }
      await projektiDatabase.clearNewFeedbacksFlagOnProject(oid);
    }
  }
}

export const palauteEmailService = new PalauteEmailService();
