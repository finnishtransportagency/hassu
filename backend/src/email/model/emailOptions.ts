// Contains code generated or recommended by Amazon Q
import SMTPTransport from "nodemailer/lib/smtp-transport";

export type EmailOptions = Partial<Pick<SMTPTransport.MailOptions, "to" | "subject" | "text" | "attachments" | "cc">> & Required<Pick<SMTPTransport.MailOptions, "subject" | "text">>;
