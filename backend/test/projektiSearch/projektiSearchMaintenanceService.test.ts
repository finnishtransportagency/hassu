import { describe, it } from "mocha";
import {
  OpenSearchClient,
  openSearchClientIlmoitustauluSyote,
  openSearchClientJulkinen,
  openSearchClientYllapito,
} from "../../src/projektiSearch/openSearchClient";
import * as sinon from "sinon";
import { expect } from "chai";
import { ProjektiSearchMaintenanceService } from "../../src/projektiSearch/projektiSearchMaintenanceService";
import { ProjektiDatabase, projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { parameters } from "../../src/aws/parameters";

describe("ProjektiSearchMaintenanceService", () => {
  let yllapitoStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let suomiStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let ruotsiStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let ilmoitustauluStub: sinon.SinonStubbedInstance<OpenSearchClient>;
  let projektiDatabaseStub: sinon.SinonStubbedInstance<ProjektiDatabase>;

  before(() => {
    yllapitoStub = sinon.stub(openSearchClientYllapito);
    suomiStub = sinon.stub(openSearchClientJulkinen["SUOMI"]);
    ruotsiStub = sinon.stub(openSearchClientJulkinen["RUOTSI"]);
    ilmoitustauluStub = sinon.stub(openSearchClientIlmoitustauluSyote);
    projektiDatabaseStub = sinon.stub(projektiDatabase);
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });
  afterEach(() => {
    sinon.reset();
  });
  after(() => {
    sinon.restore();
  });

  it("should delete and create index", async () => {
    const projekti1 = new ProjektiFixture().dbProjektiHyvaksymisMenettelyssa();
    projektiDatabaseStub.scanProjektit.resolves({
      projektis: [projekti1],
      startKey: undefined,
    });
    const service = new ProjektiSearchMaintenanceService();
    await service.deleteIndex();
    await service.index({ action: "index", startKey: undefined });

    [yllapitoStub, suomiStub, ruotsiStub].forEach((clientStub) => {
      expect(clientStub.put.calledOnce).to.be.true;
      expect(clientStub.deleteIndex.calledOnce).to.be.true;
      expect(clientStub.putSettings.calledOnce).to.be.true;
      expect(clientStub.putMapping.calledOnce).to.be.true;
      expect(clientStub.delete.calledOnce).to.be.false;
    });

    expect(ilmoitustauluStub.put.calledOnce).to.be.false;
    expect(ilmoitustauluStub.deleteIndex.calledOnce).to.be.true;
    expect(ilmoitustauluStub.putSettings.calledOnce).to.be.false;
    expect(ilmoitustauluStub.putMapping.calledOnce).to.be.false;
    expect(ilmoitustauluStub.delete.calledOnce).to.be.false;
  });
});
