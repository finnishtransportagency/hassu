import { describe, it } from "mocha";
import { velho } from "../../src/velho/velhoClient";
import * as log from "loglevel";
import { tieProjekti } from "./fixture/tieProjekti";
import { velhoCache } from "../api/testUtil/cachingVelhoClient";
import { expect } from "chai";

const skipVelhoTests = process.env.SKIP_VELHO_TESTS == "true";

describe("VelhoClient", () => {
  let oid: string;
  let name: string;
  velhoCache();

  before(() => (process.env.VELHO_READ_ONLY = "false"));
  after(() => (process.env.VELHO_READ_ONLY = "true"));

  it("should list projects from Velho", async function () {
    if (skipVelhoTests) {
      this.skip();
    }
    const searchResult = await velho.searchProjects("HASSU AUTOMAATTITESTIPROJEKTI1");
    expect(searchResult).not.null;
    expect(searchResult).not.be.empty;
    const firstSearchResult = searchResult[0];
    log.debug(firstSearchResult);
    name = firstSearchResult.nimi;
    oid = firstSearchResult.oid;
    log.debug("nimi", name);
  });

  it("should list one exact project from Velho", async function () {
    if (skipVelhoTests) {
      this.skip();
    }
    expect(oid).to.not.be.null;
    expect(name).to.not.be.null;
    const exactSearchResult = await velho.searchProjects(name, true);
    expect(exactSearchResult).not.be.empty;
    log.debug(exactSearchResult);
    expect(exactSearchResult[0].oid).to.be.equal(oid);
  });

  it("should load project from Velho", async function () {
    if (skipVelhoTests) {
      this.skip();
    }
    expect(oid).to.not.be.null;
    const projektiAineistot = await velho.loadProjektiAineistot(oid);
    const dokumenttiOid = projektiAineistot[0].aineistot[0].oid;
    const link = await velho.getLinkForDocument(dokumenttiOid);
    expect(link).to.contain("https://");
  });

  it.skip("should create project to Velho for testing and delete it", async function () {
    if (skipVelhoTests) {
      this.skip();
    }
    expect(await velho.authenticate()).not.be.null;
    const result = await velho.createProjektiForTesting(tieProjekti("Automaattitesti " + new Date().toISOString()));
    expect(result).not.null;
    expect(result.oid).not.null;
    // tslint:disable-next-line:no-console
    console.log(result.oid);
    await velho.deleteProjektiForTesting(result.oid);
  });
});
