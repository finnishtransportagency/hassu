import { describe, it } from "mocha";
import { handleDynamoDBEvents } from "../../src/projektiSearch/dynamoDBStreamHandler";
import { ProjektiSearchFixture } from "./projektiSearchFixture";
import { openSearchClientJulkinen, openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { Context } from "aws-lambda";

const sandbox = require("sinon").createSandbox();

const { expect } = require("chai");

describe("dynamoDBStreamHandler", () => {
  let fixture: ProjektiSearchFixture;
  const projektiFixture: ProjektiFixture = new ProjektiFixture();
  const projekti = projektiFixture.dbProjekti2;
  const indexProjektiStub = sandbox.stub(openSearchClientYllapito, "putProjekti");
  const removeProjektiStub = sandbox.stub(openSearchClientYllapito, "deleteProjekti");
  const indexProjektiSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "putProjekti");
  const indexProjektiRuotsiStub = sandbox.stub(openSearchClientJulkinen["RUOTSI"], "putProjekti");
  const removeProjektiSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "deleteProjekti");
  const removeProjektiRuotsiStub = sandbox.stub(openSearchClientJulkinen["RUOTSI"], "deleteProjekti");
  const removeProjektiSaameStub = sandbox.stub(openSearchClientJulkinen["SAAME"], "deleteProjekti");

  beforeEach(() => {
    fixture = new ProjektiSearchFixture();
  });
  afterEach(() => {
    sandbox.reset();
  });
  after(() => {
    sandbox.restore();
  });

  const context = { functionName: "myFunction" } as Context;
  it("should index new projektis successfully", async () => {
    await handleDynamoDBEvents(fixture.createNewProjektiEvent(projekti), context);
    expect(indexProjektiStub).callCount(1);
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiSuomiStub.getCall(0).args[1]).toMatchSnapshot();
    expect(indexProjektiRuotsiStub.getCall(0).args[1]).toMatchSnapshot();
  });

  it("should index projekti updates successfully", async () => {
    await handleDynamoDBEvents(fixture.createUpdateProjektiEvent(projekti), context);
    expect(indexProjektiStub).callCount(1);
    expect(indexProjektiStub.getCall(0).args[0]).to.be.equal(projekti.oid);
    expect(indexProjektiStub.getCall(0).args[1]).toMatchSnapshot();
  });

  it("should remove deleted projekti from index successfully", async () => {
    await handleDynamoDBEvents(fixture.createdDeleteProjektiEvent(projekti.oid), context);
    expect(removeProjektiStub).callCount(1);
    expect(removeProjektiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiSuomiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiRuotsiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
    expect(removeProjektiSaameStub.getCall(0).firstArg).to.be.equal(projekti.oid);
  });
});
