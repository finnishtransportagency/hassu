import { PDF } from "../../../common/graphql/apiModel";
import { Kutsu21 } from "./suunnittelunAloitus/Kutsu21";
import { EmailOptions } from "../email/email";
import { Attachment } from "nodemailer/lib/mailer";
import { YleisotilaisuusKutsuPdfOptions } from "./asiakirjaTypes";

export class AsiakirjaEmailService {
  createYleisotilaisuusKutsuEmail(options: YleisotilaisuusKutsuPdfOptions): EmailOptions {
    const { velho } = options;
    if (!velho) {
      throw new Error("projekti.velho puuttuu");
    }
    if (!velho.tyyppi) {
      throw new Error("projekti.velho.tyyppi puuttuu");
    }
    if (!velho.vaylamuoto) {
      throw new Error("projekti.velho.vaylamuoto puuttuu");
    }
    return new Kutsu21(options).createEmail();
  }

  createPDFAttachment(pdf: PDF): Attachment {
    return {
      filename: pdf.nimi,
      contentDisposition: "attachment",
      contentType: "application/pdf",
      content: Buffer.from(pdf.sisalto, "base64"),
    };
  }
}

export const asiakirjaEmailService = new AsiakirjaEmailService();
