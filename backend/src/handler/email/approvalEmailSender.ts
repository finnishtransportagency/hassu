import { DBProjekti } from "../../database/model";
import { createAloituskuulutusHyvaksyttavanaEmail } from "../../email/emailTemplates";
import { emailClient } from "../../email/email";
import { log } from "../../logger";

class ApprovalEmailSender {
  public async sendEmails(projekti: DBProjekti): Promise<void> {
    const emailOptions = createAloituskuulutusHyvaksyttavanaEmail(projekti);
    if (emailOptions.to) {
      await emailClient.sendEmail(emailOptions);
    } else {
      log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

export const approvalEmailSender = new ApprovalEmailSender();
