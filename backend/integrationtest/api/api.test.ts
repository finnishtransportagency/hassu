/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { runAsVaylaUser } from "../util/users";
import { api } from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";

const { expect } = require("chai");

async function loadProjektiFromVelho(oid: string) {
  const projekti = await api.lataaProjekti(oid);
  expect(projekti.tallennettu).to.be.false;
}

async function loadProjektiFromDatabase(oid: string) {
  const savedProjekti = await api.lataaProjekti(oid);
  expect(savedProjekti.tallennettu).to.be.true;
  return savedProjekti;
}

describe("Api", () => {
  beforeEach("Initialize test database", async () => await setupLocalDatabase());

  it("should search, load and save a project", async () => {
    runAsVaylaUser();

    const oid = await searchProjectsFromVelhoAndPickFirst();
    await loadProjektiFromVelho(oid);

    await api.tallennaProjekti({ oid });
    await loadProjektiFromDatabase(oid);

    const newDescription = "uusi kuvaus";
    await api.tallennaProjekti({ oid, kuvaus: newDescription });

    const updatedProjekti = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti.kuvaus).to.be.equal(newDescription);
  });
});

async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
  const searchResult = await api.getVelhoSuunnitelmasByName("tampere");
  // tslint:disable-next-line:no-unused-expression
  expect(searchResult).not.to.be.empty;

  const oid = searchResult.pop()?.oid;
  if (!oid) {
    fail("No suitable projekti found from Velho");
  }
  return oid;
}
