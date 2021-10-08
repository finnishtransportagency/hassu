/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { runAsVaylaUser } from "../util/users";
import * as apiClient from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";

const { expect } = require("chai");

async function loadProjektiFromVelho(oid: string) {
  const projekti = await apiClient.lataaProjekti(oid);
  expect(projekti.tallennettu).to.be.false;
}

async function loadProjektiFromDatabase(oid: string) {
  const savedProjekti = await apiClient.lataaProjekti(oid);
  expect(savedProjekti.tallennettu).to.be.true;
  return savedProjekti;
}

describe("Api", () => {
  beforeEach("Initialize test database", async () => await setupLocalDatabase());

  it("should search, load and save a project", async () => {
    runAsVaylaUser();

    const oid = await apiClient.searchProjectsFromVelhoAndPickFirst();
    await loadProjektiFromVelho(oid);

    await apiClient.tallennaProjekti({ oid });
    await loadProjektiFromDatabase(oid);

    const newDescription = "uusi kuvaus";
    await apiClient.tallennaProjekti({ oid, kuvaus: newDescription });

    const updatedProjekti = await loadProjektiFromDatabase(oid);
    expect(updatedProjekti.kuvaus).to.be.equal(newDescription);
  });
});
