import * as nodemailer from "nodemailer";
import { config } from "../config";
import { log } from "../logger";
import SMTPTransport, { MailOptions } from "nodemailer/lib/smtp-transport";
import cloneDeep from "lodash/cloneDeep";
import isArray from "lodash/isArray";
import { parameters } from "../aws/parameters";
import { parse } from "yaml";

type SMTPConfig = {
  SMTP_KEY_ID: string;
  SMTP_SECRET: string;
  EMAILS_FROM: string;
};

type TurvapostiConfig = {
  LOGIN: string;
  PASSWORD: string;
  SERVER: string;
};

async function getSMTPConfig() {
  const smtpConfigString = await parameters.getRequiredInfraParameter("SMTPConfig");
  const smtpConfig: SMTPConfig = parse(smtpConfigString);
  return smtpConfig;
}

async function getTurvapostiConfig() {
  const turvapostiConfigString = await parameters.getRequiredInfraParameter("TurvapostiConfig");
  const turvapostiConfig: TurvapostiConfig = parse(turvapostiConfigString);
  return turvapostiConfig;
}

function getTransport(smtpConfig: SMTPConfig) {
  return nodemailer.createTransport({
    port: 465,
    host: "email-smtp.eu-west-1.amazonaws.com",
    secure: true,
    auth: {
      user: smtpConfig.SMTP_KEY_ID,
      pass: smtpConfig.SMTP_SECRET,
    },
    debug: true,
  });
}

function getTurvapostiTransport(turvapostiConfig: TurvapostiConfig) {
  return nodemailer.createTransport({
    port: 465,
    host: turvapostiConfig.SERVER,
    secure: true,
    auth: {
      user: turvapostiConfig.LOGIN,
      pass: turvapostiConfig.PASSWORD,
    },
    debug: true,
  });
}

export type EmailOptions = Pick<MailOptions, "to" | "subject" | "text" | "attachments" | "cc">;

class EmailClient {
  async sendEmail(options: EmailOptions): Promise<SMTPTransport.SentMessageInfo | undefined> {
    return this.sendEmailInternal(options, false);
  }

  async sendTurvapostiEmail(options: EmailOptions): Promise<SMTPTransport.SentMessageInfo | undefined> {
    return this.sendEmailInternal(options, true);
  }

  async sendEmailInternal(options: EmailOptions, isTurvaposti: boolean): Promise<SMTPTransport.SentMessageInfo | undefined> {
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

    const smtpConfig = await getSMTPConfig();

    const to = config.emailsTo || options.to;
    const cc = config.emailsTo || options.cc;
    const from = smtpConfig.EMAILS_FROM;
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
      let transport;
      if (isTurvaposti) {
        const turvapostiConfig = await getTurvapostiConfig();
        transport = getTurvapostiTransport(turvapostiConfig);
      } else {
        transport = getTransport(smtpConfig);
      }
      const messageInfo = await transport.sendMail(mailOptions);
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
  }
}

export const emailClient = new EmailClient();
