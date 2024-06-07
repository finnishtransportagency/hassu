import { describe, it } from "mocha";
import { handleDynamoDBEvents } from "../../src/projektiSearch/dynamoDBStreamHandler";
import { ProjektiSearchFixture } from "./projektiSearchFixture";
import { ProjektiFixture } from "../fixture/projektiFixture";
import sinon, { SinonStubbedInstance } from "sinon";
import { expect } from "chai";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import { parameters } from "../../src/aws/parameters";
import { mockClient } from "aws-sdk-client-mock";
import { SQSClient } from "@aws-sdk/client-sqs";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { MaintenanceEvent } from "../../src/projektiSearch/projektiSearchMaintenanceService";
import OpenSearchClient from "../../src/projektiSearch/openSearchClient";
import openSearchClientYllapito from "../../src/projektiSearch/openSearchClientYllapito";
import { openSearchClientJulkinen } from "../../src/projektiSearch/openSearchClientJulkinen";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClientIlmoitustauluSyote";
import { mockUUID } from "../../integrationtest/shared/sharedMock";

describe("dynamoDBStreamHandler", () => {
  let fixture: ProjektiSearchFixture;
  const projektiFixture: ProjektiFixture = new ProjektiFixture();
  const projekti1 = projektiFixture.dbProjekti1();
  const projekti2 = projektiFixture.dbProjekti2();
  const projekti3 = projektiFixture.dbProjekti5();
  let indexProjektiStub: sinon.SinonStub;
  let removeProjektiStub: sinon.SinonStub;
  let indexProjektiSuomiStub: sinon.SinonStub;
  let indexProjektiRuotsiStub: sinon.SinonStub;
  let removeProjektiSuomiStub: sinon.SinonStub;
  let removeProjektiRuotsiStub: sinon.SinonStub;
  let openSearchClientIlmoitustauluSyoteStub: SinonStubbedInstance<OpenSearchClient>;
  mockUUID();

  before(() => {
    fixture = new ProjektiSearchFixture();

    indexProjektiStub = sinon.stub(openSearchClientYllapito, "putDocument");
    removeProjektiStub = sinon.stub(openSearchClientYllapito, "deleteDocument");
    indexProjektiSuomiStub = sinon.stub(openSearchClientJulkinen["SUOMI"], "putDocument");
    indexProjektiRuotsiStub = sinon.stub(openSearchClientJulkinen["RUOTSI"], "putDocument");
    removeProjektiSuomiStub = sinon.stub(openSearchClientJulkinen["SUOMI"], "deleteDocument");
    removeProjektiRuotsiStub = sinon.stub(openSearchClientJulkinen["RUOTSI"], "deleteDocument");
    openSearchClientIlmoitustauluSyoteStub = sinon.stub(openSearchClientIlmoitustauluSyote);
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  beforeEach(() => {
    openSearchClientIlmoitustauluSyoteStub.putDocument.resolves();
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should index new projektis successfully", async () => {
    await handleDynamoDBEvents(fixture.createNewProjektiEvent(projekti2));
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti2.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiSuomiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiRuotsiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
  });

  it("should index projekti updates successfully", async () => {
    await handleDynamoDBEvents(fixture.createUpdateProjektiEvent(projekti2));
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti2.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls().map((call) => call.args)).toMatchSnapshot();
  });

  it("should remove deleted projekti from index successfully", async () => {
    const indexedKuulutusId = "indexed_kuulutus_id";
    openSearchClientIlmoitustauluSyoteStub.query.resolves({
      hits: {
        hits: [
          {
            _id: indexedKuulutusId,
          },
        ],
      },
    });

    await handleDynamoDBEvents(fixture.createdDeleteProjektiEvent(projekti2.oid));
    expect(removeProjektiStub.calledOnce).to.be.true;
    expect(removeProjektiStub.getCall(0).firstArg).to.be.equal(projekti2.oid);
    expect(removeProjektiSuomiStub.getCall(0).firstArg).to.be.equal(projekti2.oid);
    expect(removeProjektiRuotsiStub.getCall(0).firstArg).to.be.equal(projekti2.oid);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCalls()).to.have.length(1);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCall(0).lastArg).to.eq(indexedKuulutusId);
  });

  it("should reindex the database successfully", async () => {
    sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(projekti2);
    const sqsEvent: SQSEvent = {
      Records: [
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        {
          messageId: "1",
          body: JSON.stringify({ action: "index", oid: projekti2.oid }),
        } as SQSRecord,
      ],
    };
    await handleDynamoDBEvents(sqsEvent);
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti2.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls().map((call) => call.args)).toMatchSnapshot();
  });

  it("should reindex the database successfully on maintenance event", async () => {
    sinon
      .stub(projektiDatabase, "scanProjektit")
      .onFirstCall()
      .resolves({ projektis: [projekti1, projekti2], startKey: "startkey1" })
      .onSecondCall()
      .resolves({ projektis: [projekti3], startKey: undefined });
    sinon.stub(parameters, "getIndexerSQSUrl").resolves("mockedIndexerSQSUrl");
    const sqsStub = mockClient(SQSClient);

    const mEvent: MaintenanceEvent = {
      action: "index",
    };
    await handleDynamoDBEvents(mEvent);
    expect(indexProjektiStub.calledOnce).to.be.false;

    expect(sqsStub.send).to.have.been.calledTwice;
    expect(sqsStub.send.args[0][0].input).toMatchSnapshot();
    expect(sqsStub.send.args[1][0].input).toMatchSnapshot();
  });
});
