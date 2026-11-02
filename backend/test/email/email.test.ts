// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import * as nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { parameters } from "../../src/aws/parameters";
import { config } from "../../src/config";
import { emailClient } from "../../src/email/email";
import { EmailOptions } from "../../src/email/model/emailOptions";

const SMTP_CONFIG_YAML = `
SMTP_KEY_ID: test-key-id
SMTP_SECRET: test-secret
EMAILS_FROM: noreply@example.com
`;

const TURVAPOSTI_CONFIG_YAML = `
LOGIN: turva-user
PASSWORD: turva-pass
SERVER: 193.200.52.15
PORT: 587
`;

const EMAIL_OPTIONS: EmailOptions = {
  subject: "Test subject",
  text: "Test body",
  to: "recipient@example.com",
};

describe("EmailClient", () => {
  let getRequiredInfraParameterStub: sinon.SinonStub;
  let createTransportStub: sinon.SinonStub;
  let sendMailStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  before(() => {
    getRequiredInfraParameterStub = sinon.stub(parameters, "getRequiredInfraParameter");
    createTransportStub = sinon.stub(nodemailer, "createTransport");
  });

  beforeEach(() => {
    getRequiredInfraParameterStub.callsFake((paramName: string) => {
      if (paramName === "SMTPConfig") return Promise.resolve(SMTP_CONFIG_YAML);
      if (paramName === "TurvapostiConfig") return Promise.resolve(TURVAPOSTI_CONFIG_YAML);
      return Promise.resolve("value_" + paramName);
    });

    sendMailStub = sinon.stub();
    createTransportStub.returns({ sendMail: sendMailStub } as unknown as SMTPTransport);

    config.emailsOn = "true";
    config.emailsTo = undefined;

    clock = sinon.useFakeTimers({ toFake: ["setTimeout"] });
  });

  afterEach(() => {
    sinon.reset();
    clock.restore();
    config.emailsOn = process.env.EMAILS_ON;
    config.emailsTo = process.env.EMAILS_TO;
  });

  after(() => {
    sinon.restore();
  });

  describe("sendEmail", () => {
    it("returns undefined and does not send when emailsOn is not 'true'", async () => {
      config.emailsOn = "false";
      const result = await emailClient.sendEmail(EMAIL_OPTIONS);
      expect(result).to.be.undefined;
      expect(createTransportStub.called).to.be.false;
    });

    it("returns undefined and logs error when 'to' is missing", async () => {
      const result = await emailClient.sendEmail({ subject: "Test", text: "Body" });
      expect(result).to.be.undefined;
      expect(sendMailStub.called).to.be.false;
    });

    it("sends email and returns messageInfo on success", async () => {
      const messageInfo = { accepted: ["recipient@example.com"], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      const result = await emailClient.sendEmail(EMAIL_OPTIONS);

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledOnce).to.be.true;
    });

    it("uses config.emailsTo as recipient when set", async () => {
      config.emailsTo = "override@example.com";
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      await emailClient.sendEmail(EMAIL_OPTIONS);

      const mailOptions = sendMailStub.firstCall.firstArg;
      expect(mailOptions.to).to.equal("override@example.com");
    });

    it("appends original 'to' to accepted when config.emailsTo is set", async () => {
      config.emailsTo = "override@example.com";
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      const result = await emailClient.sendEmail(EMAIL_OPTIONS);

      expect(result?.accepted).to.include("recipient@example.com");
    });

    it("appends all original 'to' addresses to accepted when 'to' is an array and config.emailsTo is set", async () => {
      config.emailsTo = "override@example.com";
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      const result = await emailClient.sendEmail({ ...EMAIL_OPTIONS, to: ["a@example.com", "b@example.com"] });

      expect(result?.accepted).to.include.members(["a@example.com", "b@example.com"]);
    });
  });

  describe("sendTurvapostiEmail", () => {
    it("adds .sec suffix to string 'to' recipient", async () => {
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      await emailClient.sendTurvapostiEmail(EMAIL_OPTIONS);

      const mailOptions = sendMailStub.firstCall.firstArg;
      expect(mailOptions.to).to.equal("recipient@example.com.sec");
    });

    it("adds .sec suffix to all 'to' recipients in array", async () => {
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      await emailClient.sendTurvapostiEmail({ ...EMAIL_OPTIONS, to: ["a@example.com", "b@example.com"] });

      const mailOptions = sendMailStub.firstCall.firstArg;
      expect(mailOptions.to).to.deep.equal(["a@example.com.sec", "b@example.com.sec"]);
    });

    it("adds .sec suffix to 'cc' recipients", async () => {
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      await emailClient.sendTurvapostiEmail({ ...EMAIL_OPTIONS, cc: "cc@example.com" });

      const mailOptions = sendMailStub.firstCall.firstArg;
      expect(mailOptions.cc).to.equal("cc@example.com.sec");
    });

    it("uses TurvapostiConfig parameters", async () => {
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.resolves(messageInfo);

      await emailClient.sendTurvapostiEmail(EMAIL_OPTIONS);

      expect(getRequiredInfraParameterStub.calledWith("TurvapostiConfig")).to.be.true;
    });
  });

  describe("retry logic", () => {
    it("retries on ESOCKET and succeeds on second attempt", async () => {
      const socketError = Object.assign(new Error("connect error"), { code: "ESOCKET" });
      const messageInfo = { accepted: ["recipient@example.com"], rejected: [], messageId: "123" };
      sendMailStub.onFirstCall().rejects(socketError);
      sendMailStub.onSecondCall().resolves(messageInfo);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      const result = await resultPromise;

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledTwice).to.be.true;
    });

    it("retries on ECONNREFUSED and succeeds on second attempt", async () => {
      const error = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.onFirstCall().rejects(error);
      sendMailStub.onSecondCall().resolves(messageInfo);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      const result = await resultPromise;

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledTwice).to.be.true;
    });

    it("retries on ETIMEDOUT and succeeds on second attempt", async () => {
      const error = Object.assign(new Error("timed out"), { code: "ETIMEDOUT" });
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.onFirstCall().rejects(error);
      sendMailStub.onSecondCall().resolves(messageInfo);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      const result = await resultPromise;

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledTwice).to.be.true;
    });

    it("retries on ECONNRESET and succeeds on second attempt", async () => {
      const error = Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.onFirstCall().rejects(error);
      sendMailStub.onSecondCall().resolves(messageInfo);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      const result = await resultPromise;

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledTwice).to.be.true;
    });

    it("retries twice with correct delays and succeeds on third attempt", async () => {
      const error = Object.assign(new Error("connect error"), { code: "ESOCKET" });
      const messageInfo = { accepted: [], rejected: [], messageId: "123" };
      sendMailStub.onFirstCall().rejects(error);
      sendMailStub.onSecondCall().rejects(error);
      sendMailStub.onThirdCall().resolves(messageInfo);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      await clock.tickAsync(3 * 1000);
      const result = await resultPromise;

      expect(result).to.equal(messageInfo);
      expect(sendMailStub.calledThrice).to.be.true;
    });

    it("returns undefined after exhausting all retries on persistent network error", async () => {
      const error = Object.assign(new Error("connect error"), { code: "ESOCKET" });
      sendMailStub.rejects(error);

      const resultPromise = emailClient.sendEmail(EMAIL_OPTIONS);
      await clock.tickAsync(1 * 1000);
      await clock.tickAsync(3 * 1000);
      const result = await resultPromise;

      expect(result).to.be.undefined;
      expect(sendMailStub.calledThrice).to.be.true;
    });

    it("does not retry on non-retryable error (EAUTH) and returns undefined immediately", async () => {
      const authError = Object.assign(new Error("auth failed"), { code: "EAUTH" });
      sendMailStub.rejects(authError);

      const result = await emailClient.sendEmail(EMAIL_OPTIONS);

      expect(result).to.be.undefined;
      expect(sendMailStub.calledOnce).to.be.true;
    });

    it("does not retry on non-retryable error (ENOTFOUND) and returns undefined immediately", async () => {
      const dnsError = Object.assign(new Error("dns not found"), { code: "ENOTFOUND" });
      sendMailStub.rejects(dnsError);

      const result = await emailClient.sendEmail(EMAIL_OPTIONS);

      expect(result).to.be.undefined;
      expect(sendMailStub.calledOnce).to.be.true;
    });
  });
});
