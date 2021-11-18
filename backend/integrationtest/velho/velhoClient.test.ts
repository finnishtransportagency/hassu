/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { velho } from "../../src/velho/velhoClient";
import * as log from "loglevel";

describe("VelhoClient", () => {
  let oid: string;
  let name: string;

  it("should authenticate to Velho", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    expect(await velho.authenticate()).not.be.null;
  });

  it("should list projects from Velho", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    const searchResult = await velho.searchProjects("tampere");
    expect(searchResult).not.null;
    expect(searchResult).not.be.empty;
    const firstSearchResult = searchResult[0];
    log.debug(firstSearchResult);
    name = firstSearchResult.nimi;
    oid = firstSearchResult.oid;
    log.debug("nimi", name);
  });

  it("should list one exact project from Velho", async function () {
    if (process.env.SKIP_VELHO_TESTS) {
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
    if (process.env.SKIP_VELHO_TESTS) {
      this.skip();
    }
    expect(oid).to.not.be.null;
    const searchResult = await velho.loadProjekti(oid);
    expect(searchResult).not.null;
    log.debug(JSON.stringify(searchResult, null, 2));
  });
});
