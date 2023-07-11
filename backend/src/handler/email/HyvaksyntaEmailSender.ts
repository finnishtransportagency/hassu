export abstract class KuulutusHyvaksyntaEmailSender {
  public abstract sendEmails(oid: string): Promise<void>;
}
