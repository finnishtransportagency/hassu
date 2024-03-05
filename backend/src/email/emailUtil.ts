import MailComposer from "nodemailer/lib/mail-composer";
import { LadattuTiedosto, SahkopostiVastaanottaja } from "../database/model";
import { PathTuple } from "../files/ProjektiPath";
import { AsiakirjaTyyppi } from "hassu-common/graphql/apiModel";
import { fileService } from "../files/fileService";
import { dateTimeToString } from "../util/dateUtil";
import dayjs from "dayjs";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { log } from "../logger";
import { config } from "../config";
import { EmailOptions } from "./model/emailOptions";

export async function saveEmailAsFile(
  oid: string,
  path: PathTuple,
  lahetekirje: EmailOptions,
  asiakirjaTyyppi: AsiakirjaTyyppi
): Promise<LadattuTiedosto> {
  const fileName = "lähetekirje.eml";
  const contents = await emailOptionsToEml(lahetekirje);
  const filePath = await fileService.createFileToProjekti({
    oid,
    path,
    fileName,
    contents,
    contentType: "message/rfc822",
    asiakirjaTyyppi,
    inline: false,
  });
  return {
    nimi: fileName,
    tiedosto: filePath,
    tuotu: dateTimeToString(dayjs()),
  };
}

async function emailOptionsToEml(emailOptions: EmailOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mail = new MailComposer(emailOptions);
    mail.compile().build(function (err, message) {
      if (err) {
        reject(err);
      }
      resolve(message);
    });
  });
}

export function examineEmailSentResults(
  vastaanottaja: SahkopostiVastaanottaja,
  sentMessageInfo: SMTPTransport.SentMessageInfo | undefined,
  aikaleima: string
): void {
  // Sähköpostien lähetyksessä tapahtui virhe
  if (!sentMessageInfo) {
    vastaanottaja.lahetysvirhe = true;
  }
  const email = vastaanottaja.sahkoposti;
  if (sentMessageInfo?.accepted.find((accepted) => accepted == email) || sentMessageInfo?.pending?.find((pending) => pending == email)) {
    vastaanottaja.lahetetty = aikaleima;
    vastaanottaja.messageId = sentMessageInfo?.messageId;
    log.info("Email lähetetty", { sentEmail: email, actualEmailAddress: config.emailsTo });
  }
  if (sentMessageInfo?.rejected.find((rejected) => rejected == email)) {
    log.info("Email lähetysvirhe", { rejectedEmail: email });
    vastaanottaja.lahetysvirhe = true;
  }
}

// eslint-disable-next-line no-useless-escape
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
export function isValidEmail(email: string): boolean {
  if (new RegExp(emailRegex).test(email)) {
    return true;
  }
  return false;
}
