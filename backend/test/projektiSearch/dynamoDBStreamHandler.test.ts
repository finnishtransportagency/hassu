import { describe, it } from "mocha";
import { handleDynamoDBEvents } from "../../src/projektiSearch/dynamoDBStreamHandler";
import { ProjektiSearchFixture } from "./projektiSearchFixture";
import {
  OpenSearchClient,
  openSearchClientIlmoitustauluSyote,
  openSearchClientJulkinen,
  openSearchClientYllapito,
} from "../../src/projektiSearch/openSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import sinon, { SinonStubbedInstance } from "sinon";
import { expect } from "chai";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import { parameters } from "../../src/aws/parameters";
import { mockClient } from "aws-sdk-client-mock";
import { SQSClient } from "@aws-sdk/client-sqs";
import { projektiDatabase } from "../../src/database/projektiDatabase";

describe("dynamoDBStreamHandler", () => {
  let fixture: ProjektiSearchFixture;
  const projektiFixture: ProjektiFixture = new ProjektiFixture();
  const projekti = projektiFixture.dbProjekti2();
  let indexProjektiStub: sinon.SinonStub;
  let removeProjektiStub: sinon.SinonStub;
  let indexProjektiSuomiStub: sinon.SinonStub;
  let indexProjektiRuotsiStub: sinon.SinonStub;
  let removeProjektiSuomiStub: sinon.SinonStub;
  let removeProjektiRuotsiStub: sinon.SinonStub;
  let openSearchClientIlmoitustauluSyoteStub: SinonStubbedInstance<OpenSearchClient>;

  before(() => {
    fixture = new ProjektiSearchFixture();

    indexProjektiStub = sinon.stub(openSearchClientYllapito, "putDocument");
    removeProjektiStub = sinon.stub(openSearchClientYllapito, "deleteDocument");
    indexProjektiSuomiStub = sinon.stub(openSearchClientJulkinen["SUOMI"], "putDocument");
    indexProjektiRuotsiStub = sinon.stub(openSearchClientJulkinen["RUOTSI"], "putDocument");
    removeProjektiSuomiStub = sinon.stub(openSearchClientJulkinen["SUOMI"], "deleteDocument");
    removeProjektiRuotsiStub = sinon.stub(openSearchClientJulkinen["RUOTSI"], "deleteDocument");
    openSearchClientIlmoitustauluSyoteStub = sinon.stub(openSearchClientIlmoitustauluSyote);
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
    await handleDynamoDBEvents(fixture.createNewProjektiEvent(projekti));
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiSuomiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiRuotsiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
  });

  it("should index projekti updates successfully", async () => {
    await handleDynamoDBEvents(fixture.createUpdateProjektiEvent(projekti));
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
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

    await handleDynamoDBEvents(fixture.createdDeleteProjektiEvent(projekti.oid));
    expect(removeProjektiStub.calledOnce).to.be.true;
    expect(removeProjektiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiSuomiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiRuotsiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCalls()).to.have.length(1);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCall(0).lastArg).to.eq(indexedKuulutusId);
  });

  it("should reindex the database successfully", async () => {
    sinon.stub(projektiDatabase, "scanProjektit").resolves({
      projektis: [projekti],
      startKey: "startkey1",
    });
    sinon.stub(parameters, "getIndexerSQSUrl").resolves("mockedIndexerSQSUrl");
    const sqsStub = mockClient(SQSClient);

    const sqsEvent: SQSEvent = {
      Records: [
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        {
          messageId: "1",
          body: JSON.stringify({ action: "index" }),
        } as SQSRecord,
      ],
    };
    await handleDynamoDBEvents(sqsEvent);
    expect(indexProjektiStub.calledOnce).to.be.true;
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls().map((call) => call.args)).toMatchSnapshot();

    expect(sqsStub.send).to.have.been.calledOnce;
    expect(sqsStub.send.args[0][0].input).toMatchSnapshot();
  });
});
