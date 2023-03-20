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
import { Context } from "aws-lambda";
import sinon, { SinonStubbedInstance } from "sinon";

const sandbox = sinon.createSandbox();

const { expect } = require("chai");

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

    indexProjektiStub = sandbox.stub(openSearchClientYllapito, "putDocument");
    removeProjektiStub = sandbox.stub(openSearchClientYllapito, "deleteDocument");
    indexProjektiSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "putDocument");
    indexProjektiRuotsiStub = sandbox.stub(openSearchClientJulkinen["RUOTSI"], "putDocument");
    removeProjektiSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "deleteDocument");
    removeProjektiRuotsiStub = sandbox.stub(openSearchClientJulkinen["RUOTSI"], "deleteDocument");
    openSearchClientIlmoitustauluSyoteStub = sandbox.stub(openSearchClientIlmoitustauluSyote);
  });

  beforeEach(() => {
    openSearchClientIlmoitustauluSyoteStub.putDocument.resolves();
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const context = { functionName: "myFunction" } as Context;
  it("should index new projektis successfully", async () => {
    await handleDynamoDBEvents(fixture.createNewProjektiEvent(projekti), context);
    expect(indexProjektiStub).callCount(1);
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiSuomiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiRuotsiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(openSearchClientIlmoitustauluSyoteStub.putDocument.getCalls()).to.have.length(2);
  });

  it("should index projekti updates successfully", async () => {
    await handleDynamoDBEvents(fixture.createUpdateProjektiEvent(projekti), context);
    expect(indexProjektiStub).callCount(1);
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

    await handleDynamoDBEvents(fixture.createdDeleteProjektiEvent(projekti.oid), context);
    expect(removeProjektiStub).callCount(1);
    expect(removeProjektiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiSuomiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiRuotsiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCalls()).to.have.length(1);
    expect(openSearchClientIlmoitustauluSyoteStub.deleteDocument.getCall(0).lastArg).to.eq(indexedKuulutusId);
  });
});
