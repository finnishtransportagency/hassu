/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { setupLocalDatabase } from "../util/databaseUtil";
import { ProjektiSearchMaintenanceService } from "../../src/projektiSearch/projektiSearchMaintenanceService";

const { expect } = require("chai");

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe.skip("ProjektiSearchService", () => {
  const projektiFixture = new ProjektiFixture();
  const projekti1 = { ...projektiFixture.dbProjekti1, oid: "ProjektiSearchService1" };
  const projekti2 = { ...projektiFixture.dbProjekti1, oid: "ProjektiSearchService2" };

  before(async () => {
    await setupLocalDatabase();
    await projektiDatabase.createProjekti(projekti1);
    await projektiDatabase.createProjekti(projekti2);
  });

  after(async () => {
    await projektiSearchService.removeProjekti(projekti1.oid);
    await projektiSearchService.removeProjekti(projekti2.oid);
  });

  it("should index, update, search, and delete document to search engine successfully", async () => {
    const maintenanceService = new ProjektiSearchMaintenanceService();
    const startKey = await maintenanceService.index({ action: "index" });
    expect(startKey).to.be.undefined;
    await delay(500);

    const dbProjektis = await projektiSearchService.search({
      oid: [projekti1.oid],
    });
    expect(dbProjektis[0]).toMatchSnapshot();
  });
});
