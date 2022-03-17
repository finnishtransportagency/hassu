import { describe, it } from "mocha";
import { handleDynamoDBEvents } from "../../src/projektiSearch/dynamoDBStreamHandler";
import { ProjektiSearchFixture } from "./projektiSearchFixture";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { Context } from "aws-lambda";

const sandbox = require("sinon").createSandbox();

const { expect } = require("chai");

describe("dynamoDBStreamHandler", () => {
  let fixture: ProjektiSearchFixture;
  const projektiFixture: ProjektiFixture = new ProjektiFixture();
  const projekti = projektiFixture.dbProjekti1;
  const indexProjektiStub = sandbox.stub(openSearchClient, "putProjekti");
  const removeProjektiStub = sandbox.stub(openSearchClient, "deleteProjekti");

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
  });

  it("should search projects successfully", async () => {
    await handleDynamoDBEvents(fixture.createdDeleteProjektiEvent(projekti.oid), context);
    expect(removeProjektiStub).callCount(1);
    expect(removeProjektiStub.getCall(0).firstArg).to.be.equal(projekti.oid);
  });
});
