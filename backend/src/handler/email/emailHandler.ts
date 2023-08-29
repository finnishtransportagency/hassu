import { aloituskuulutusHyvaksyntaEmailSender } from "./AloituskuulutusHyvaksyntaEmailSender";
import { hyvaksymisPaatosHyvaksyntaEmailSender } from "./sendHyvaksymiskuulutusEmails";
import { nahtavillaoloHyvaksyntaEmailSender } from "./sendNahtavillaoloKuulutusEmails";

export async function sendAloitusKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await aloituskuulutusHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await hyvaksymisPaatosHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendNahtavillaKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await nahtavillaoloHyvaksyntaEmailSender.sendEmails(oid);
}
