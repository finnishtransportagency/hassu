import { MailOptions } from "nodemailer/lib/smtp-transport";

export type EmailOptions = Pick<MailOptions, "to" | "subject" | "text" | "attachments" | "cc">;
