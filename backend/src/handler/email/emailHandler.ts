import { aloituskuulutusHyvaksyntaEmailSender } from "./AloituskuulutusHyvaksyntaEmailSender";
import {
  hyvaksymisPaatosHyvaksyntaEmailSender,
  jatkoPaatos1HyvaksyntaEmailSender,
  jatkoPaatos2HyvaksyntaEmailSender,
} from "./sendHyvaksymiskuulutusEmails";
import { nahtavillaoloHyvaksyntaEmailSender } from "./sendNahtavillaoloKuulutusEmails";

export async function sendAloitusKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await aloituskuulutusHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await hyvaksymisPaatosHyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendJatkopaatos1KuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await jatkoPaatos1HyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendJatkoPaatos2KuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await jatkoPaatos2HyvaksyntaEmailSender.sendEmails(oid);
}

export async function sendNahtavillaKuulutusApprovalMailsAndAttachments(oid: string): Promise<void> {
  await nahtavillaoloHyvaksyntaEmailSender.sendEmails(oid);
}
