// Contains code generated or recommended by Amazon Q
import { describe } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import { handleEvent } from "../../src/email/emailSQSHandler";
import { EmailEventType } from "../../src/email/model/emailEvent";
import { mielipideEmailService } from "../../src/mielipide/mielipideEmailService";
import { DBMielipide } from "../../src/database/mielipideDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { config } from "../../src/config";
import { virusScanService } from "../../src/files/virusScanService";
import { LiitteenSkannausTulos } from "hassu-common/graphql/apiModel";

function makeSQSEvent(body: object): SQSEvent {
  return {
    Records: [
      {
        messageId: "1",
        receiptHandle: "handle",
        body: JSON.stringify(body),
        attributes: { ApproximateReceiveCount: "1", SentTimestamp: "0", SenderId: "x", ApproximateFirstReceiveTimestamp: "0" },
        messageAttributes: {},
        md5OfBody: "",
        eventSource: "aws:sqs",
        eventSourceARN: "arn:aws:sqs:eu-west-1:123:email-test",
        awsRegion: "eu-west-1",
      },
    ],
  };
}

describe("emailSQSHandler", () => {
  const fixture = new ProjektiFixture();
  let sendEmailToKirjaamoStub: sinon.SinonStub;
  let getVirusScanResultStub: sinon.SinonStub;
  let isPermanentEnvironmentStub: sinon.SinonStub;

  const mielipideWithLiitteet: DBMielipide = {
    oid: "",
    id: "test-id-123",
    expires: 9999999999,
    lisatty: "2024-04-09T03:00:00+03:00",
    mielipide: "Testiteksti",
    liitteet: ["/mielipiteet/test-id-123/tiedosto.pdf"],
  };

  beforeEach(() => {
    sendEmailToKirjaamoStub = sinon.stub(mielipideEmailService, "sendEmailToKirjaamo").resolves();
    getVirusScanResultStub = sinon.stub(virusScanService, "getVirusScanResult");
    isPermanentEnvironmentStub = sinon.stub(config, "isPermanentEnvironment").returns(true);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should send kirjaamo email for MIELIPIDE_KIRJAAMO event", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id-123",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Testiteksti",
      etunimi: "Tessa",
      sukunimi: "Testaaja",
      sahkoposti: "tessa@test.fi",
    };

    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock.on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE }).resolves({ Item: mielipide });

    await handleEvent(
      makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "test-id-123" }),
      {} as any,
      () => {}
    );

    sinon.assert.calledOnce(sendEmailToKirjaamoStub);
    const [projektiArg, mielipideArg] = sendEmailToKirjaamoStub.firstCall.args;
    expect(projektiArg.oid).to.equal(fixture.PROJEKTI3_OID);
    expect(mielipideArg.id).to.equal("test-id-123");
  });

  it("should send kirjaamo email when virus scan result is clean", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock
      .on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE })
      .resolves({ Item: { ...mielipideWithLiitteet, oid: fixture.PROJEKTI3_OID } });
    getVirusScanResultStub.resolves(LiitteenSkannausTulos.OK);

    await handleEvent(
      makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "test-id-123" }),
      {} as any,
      () => {}
    );

    sinon.assert.calledOnce(sendEmailToKirjaamoStub);
  });

  it("should not send kirjaamo email and discard message when virus is detected", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock
      .on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE })
      .resolves({ Item: { ...mielipideWithLiitteet, oid: fixture.PROJEKTI3_OID } });
    getVirusScanResultStub.resolves(LiitteenSkannausTulos.SAASTUNUT);

    await handleEvent(
      makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "test-id-123" }),
      {} as any,
      () => {}
    );

    sinon.assert.notCalled(sendEmailToKirjaamoStub);
  });

  it("should throw and retry when virus scan is still pending", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock
      .on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE })
      .resolves({ Item: { ...mielipideWithLiitteet, oid: fixture.PROJEKTI3_OID } });
    getVirusScanResultStub.resolves(undefined);

    await expect(
      handleEvent(
        makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "test-id-123" }),
        {} as any,
        () => {}
      )
    ).to.eventually.be.rejectedWith("Virusskannaus kesken");

    sinon.assert.notCalled(sendEmailToKirjaamoStub);
  });

  it("should skip virus scan check in non-permanent environment", async () => {
    isPermanentEnvironmentStub.returns(false);
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock
      .on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE })
      .resolves({ Item: { ...mielipideWithLiitteet, oid: fixture.PROJEKTI3_OID } });

    await handleEvent(
      makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "test-id-123" }),
      {} as any,
      () => {}
    );

    sinon.assert.notCalled(getVirusScanResultStub);
    sinon.assert.calledOnce(sendEmailToKirjaamoStub);
  });

  it("should throw when project is not found", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: undefined });

    await expect(
      handleEvent(makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: "ei-loydy", mielipideId: "test-id" }), {} as any, () => {})
    ).to.eventually.be.rejectedWith("Projektia ei löydy");

    sinon.assert.notCalled(sendEmailToKirjaamoStub);
  });

  it("should throw when mielipide is not found", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({ Item: fixture.dbProjekti3 });
    dbMock.on(GetCommand, { TableName: process.env.TABLE_PROJEKTI_MIELIPIDE }).resolves({ Item: undefined });

    await expect(
      handleEvent(
        makeSQSEvent({ type: EmailEventType.MIELIPIDE_KIRJAAMO, oid: fixture.PROJEKTI3_OID, mielipideId: "ei-loydy" }),
        {} as any,
        () => {}
      )
    ).to.eventually.be.rejectedWith("Mielipidettä ei löydy");

    sinon.assert.notCalled(sendEmailToKirjaamoStub);
  });

  it("should throw on unknown event type so SQS retries", async () => {
    mockClient(DynamoDBDocumentClient);
    await expect(handleEvent(makeSQSEvent({ type: "TUNTEMATON_TYYPPI" }), {} as any, () => {})).to.eventually.be.rejectedWith(
      "Unknown event type"
    );
  });
});
