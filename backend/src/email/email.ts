import * as nodemailer from "nodemailer";
import { config } from "../config";
import { log } from "../logger";
import { MailOptions } from "nodemailer/lib/smtp-transport";

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

export type EmailOptions = Pick<MailOptions, "to" | "subject" | "text" | "attachments">;

async function sendEmail(options: EmailOptions): Promise<void> {
  if (config.emailsOn !== "true") {
    return;
  }
  try {
    const messageInfo = await transporter.sendMail({
      from: "noreply.hassu@vaylapilvi.fi",
      ...options,
      to: config.emailsTo || options.to,
    });
    log.info("Email lähetetty", messageInfo);
  } catch (e) {
    log.error("Email lähetys epäonnistui", e);
  }
}

export const emailClient = { sendEmail };
