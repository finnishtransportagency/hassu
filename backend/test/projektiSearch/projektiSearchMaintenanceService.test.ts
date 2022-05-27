import { describe, it } from "mocha";
import {
  OpenSearchClient,
  openSearchClientJulkinen,
  openSearchClientYllapito,
} from "../../src/projektiSearch/openSearchClient";
import * as sinon from "sinon";
import { ProjektiSearchMaintenanceService } from "../../src/projektiSearch/projektiSearchMaintenanceService";

const sandbox = sinon.createSandbox();

const { expect } = require("chai");

describe("ProjektiSearchMaintenanceService", () => {
  let yllapitoStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let suomiStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let ruotsiStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let saameStub: sinon.SinonStubbedInstance<OpenSearchClient>;

  before(() => {
    yllapitoStub = sandbox.stub(openSearchClientYllapito);
    suomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"]);
    ruotsiStub = sandbox.stub(openSearchClientJulkinen["RUOTSI"]);
    saameStub = sandbox.stub(openSearchClientJulkinen["SAAME"]);
  });
  afterEach(() => {
    sandbox.reset();
  });
  after(() => {
    sandbox.restore();
  });

  it("should delete and create index", async () => {
    await new ProjektiSearchMaintenanceService().deleteIndex();
    [yllapitoStub, suomiStub, ruotsiStub, saameStub].map((clientStub) => {
      [clientStub.put, clientStub.delete, clientStub.putSettings, clientStub.putMapping].forEach((operationStub) =>
        expect(operationStub.calledOnce)
      );
    });
  });
});
