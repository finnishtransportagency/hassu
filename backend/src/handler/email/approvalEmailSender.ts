import { DBProjekti } from "../../database/model";
import { createKuulutusHyvaksyttavanaEmail } from "../../email/emailTemplates";
import { emailClient } from "../../email/email";
import { log } from "../../logger";
import { TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";

class ApprovalEmailSender {
  public async sendEmails(projekti: DBProjekti, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void> {
    const emailOptions = createKuulutusHyvaksyttavanaEmail(projekti, tilasiirtymaTyyppi);
    if (emailOptions.to) {
      await emailClient.sendEmail(emailOptions);
    } else {
      log.error("Kuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
    }
  }
}

export const approvalEmailSender = new ApprovalEmailSender();
