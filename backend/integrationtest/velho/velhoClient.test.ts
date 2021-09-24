/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { velho } from "../../src/velho/velhoClient";
import * as log from "loglevel";

describe("VelhoClient", () => {
  let oid: string;
  let name: string;

  it("should authenticate to Velho", async () => {
    expect(await velho.authenticate()).not.be.null;
  });

  it("should list projects from Velho", async () => {
    const searchResult = await velho.searchProjects("tampere");
    expect(searchResult).not.null;
    expect(searchResult).not.be.empty;
    const firstSearchResult = searchResult[0];
    log.info(firstSearchResult);
    name = firstSearchResult.name;
    oid = firstSearchResult.oid;
  });

  it("should list one exact project from Velho", async () => {
    expect(oid).to.not.be.null;
    expect(name).to.not.be.null;
    const exactSearchResult = await velho.searchProjects(name, true);
    expect(exactSearchResult).not.be.empty;
    expect(exactSearchResult[0].oid).to.be.equal(oid);
  });

  it("should load project from Velho", async () => {
    expect(oid).to.not.be.null;
    const searchResult = await velho.loadProject(oid);
    expect(searchResult).not.null;
    log.info(JSON.stringify(searchResult, null, 2));
  });
});
