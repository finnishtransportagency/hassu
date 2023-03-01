import * as nodemailer from "nodemailer";
import { config } from "../config";
import { log } from "../logger";
import SMTPTransport, { MailOptions } from "nodemailer/lib/smtp-transport";
import cloneDeep from "lodash/cloneDeep";
import isArray from "lodash/isArray";

const transporter = nodemailer.createTransport({
  port: 465,
  host: "email-smtp.eu-west-1.amazonaws.com",
  secure: true,
  auth: {
    user: config.smtpKeyId,
    pass: config.smtpSecret,
  },
  debug: true,
});

export type EmailOptions = Pick<MailOptions, "to" | "subject" | "text" | "attachments" | "cc">;

export const emailClient = {
  async sendEmail(options: EmailOptions): Promise<SMTPTransport.SentMessageInfo | undefined> {
    if (config.emailsOn !== "true") {
      const { attachments: attachments, ...restOptions } = options;
      log.info("Sähköpostin lähetys kytketty pois päältä", {
        emailOptions: restOptions,
        attachments: attachments?.map((att) => {
          const a = cloneDeep(att);
          a.content = "***test***";
          return a;
        }),
      });
      return undefined;
    }
    const to = config.emailsTo || options.to;
    const cc = config.emailsTo || options.cc;
    const from = config.emailsFrom || "noreply-vayliensuunnittelu@vaylapilvi.fi";
    const mailOptions = {
      from,
      ...options,
      to,
      cc,
    };
    if (!to) {
      log.error("Sähköpostin vastaanottajat puuttuvat", { options, "config.emailsTo": config.emailsTo });
      return;
    }
    try {
      const messageInfo = await transporter.sendMail(mailOptions);
      log.info("Email lähetetty", messageInfo);

      // Testiympäristössä kaikki postit ohjataan config.emailsTo osoittamaan osoitteeseen. Jotta koodi osaisi tulkita postit lähteneiksi, pitää lähetysraporttia huijata lisäämällä oikeat osoitteet sinne
      if (config.emailsTo) {
        if (isArray(options.to)) {
          messageInfo.accepted.push(...options.to);
        } else if (options.to) {
          messageInfo.accepted.push(options.to);
        }
      }

      return messageInfo;
    } catch (e) {
      const { attachments: _attachments, ...mailOptionsToLog } = mailOptions;
      log.error("Email lähetys epäonnistui", { mailOptions: mailOptionsToLog, e });
    }
  },
};
