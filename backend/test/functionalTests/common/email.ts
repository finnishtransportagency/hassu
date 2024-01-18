import mocha from "mocha";
import sinon from "sinon";
import { emailClient } from "../../../src/email/email";
import { EmailOptions } from "../../../src/email/model/emailOptions";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export class EmailClientStub {
  public sendEmailStub!: sinon.SinonStub;
  public sendTurvapostiEmailStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.sendEmailStub = sinon.stub(emailClient, "sendEmail");
      this.sendTurvapostiEmailStub = sinon.stub(emailClient, "sendTurvapostiEmail");
    });
    mocha.beforeEach(() => {
      const fakeEmailSender = (options: EmailOptions) => {
        return Promise.resolve({
          messageId: "messageId_test",
          accepted: (options.to || []) as string[],
          rejected: [],
          pending: [],
        } as unknown as SMTPTransport.SentMessageInfo);
      };
      this.sendEmailStub.callsFake(fakeEmailSender);
      this.sendTurvapostiEmailStub.callsFake(fakeEmailSender);
    });
  }
}
