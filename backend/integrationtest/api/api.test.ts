/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { runAsVaylaUser } from "../util/users";
import { api } from "./apiClient";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";

const { expect } = require("chai");

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
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info(JSON.stringify(projekti, null, 2));
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet: projekti.kayttoOikeudet?.map((value) => ({
        rooli: value.rooli,
        kayttajatunnus: value.kayttajatunnus,
        puhelinnumero: "123",
      })),
    });
    await loadProjektiFromDatabase(oid);

    const newDescription = "uusi kuvaus";
    await api.tallennaProjekti({
      oid,
      kuvaus: newDescription,
    });

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
