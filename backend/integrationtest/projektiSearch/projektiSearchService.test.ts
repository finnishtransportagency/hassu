/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";

const { expect } = require("chai");

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("ProjektiSearchService", () => {
  const projekti = new ProjektiFixture().dbProjekti1;

  it.skip("should index, update, search, and delete document to search engine successfully", async () => {
    await projektiSearchService.indexProjekti(projekti);
    await projektiSearchService.indexProjekti(projekti);
    await delay(500);
    const dbProjektis = await projektiSearchService.search({
      oid: [projekti.oid],
    });
    expect(dbProjektis[0]).to.deep.equal({
      oid: projekti.oid,
      muistiinpano: projekti.muistiinpano,
      velho: projekti.velho,
    });
    await projektiSearchService.removeProjekti(projekti.oid);
  });
});
