/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { velho } from "../../src/velho/velhoClient";
import * as log from "loglevel";

describe("VelhoClient", () => {
  it("should authenticate to Velho", async () => {
    expect(await velho.authenticate()).not.be.null;
  });

  it("should list projects from Velho", async () => {
    const searchResult = await velho.searchProjects("tampere");
    expect(searchResult).not.null;
    expect(searchResult).not.be.empty;
    log.info(searchResult[0]);
    const exactSearchResult = await velho.searchProjects(searchResult[0].name, true);
    expect(exactSearchResult).not.be.empty;
    expect(exactSearchResult[0].oid).to.be.equal(searchResult[0].oid);
  });
});
