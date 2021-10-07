/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import * as apiHandler from "../../src/apiHandler";
import { runAsVaylaUser } from "../util/users";
import {
  ListaaVelhoProjektitQueryVariables,
  Projekti,
  TallennaProjektiInput,
  VelhoHakuTulos,
} from "../../src/api/apiModel";
import { setupLocalDatabase } from "../util/databaseUtil";

const { expect } = require("chai");

describe("Api", () => {
  beforeEach("Initialize test database", async () => await setupLocalDatabase());

  async function searchProjectsFromVelhoAndPickFirst() {
    const input: ListaaVelhoProjektitQueryVariables = { nimi: "tampere" };
    const searchResult = (await apiHandler.handleEvent({
      info: { fieldName: apiHandler.Operation.LISTAA_VELHO_PROJEKTIT },
      arguments: input,
    } as any)) as VelhoHakuTulos[];
    expect(searchResult).not.be.empty;

    return searchResult.pop().oid;
  }

  async function lataaProjekti(oid: string) {
    const projekti = (await apiHandler.handleEvent({
      info: { fieldName: apiHandler.Operation.LATAA_PROJEKTI },
      arguments: { oid },
    } as any)) as Projekti;

    expect(projekti.oid).to.be.equal(oid);
    return projekti;
  }

  async function tallennaProjekti(input: TallennaProjektiInput) {
    await apiHandler.handleEvent({
      info: { fieldName: apiHandler.Operation.TALLENNA_PROJEKTI },
      arguments: input,
    } as any);
  }

  it("should search, load and save a project", async () => {
    runAsVaylaUser();

    const oid = await searchProjectsFromVelhoAndPickFirst();

    const projekti = await lataaProjekti(oid);
    expect(projekti.tallennettu).to.be.false;

    await tallennaProjekti({ oid });

    const savedProjekti = await lataaProjekti(oid);
    expect(savedProjekti.tallennettu).to.be.true;

    const newDescription = "uusi kuvaus";
    await tallennaProjekti({ oid, kuvaus: newDescription });

    const updatedProjekti = await lataaProjekti(oid);
    expect(updatedProjekti.tallennettu).to.be.true;
    expect(updatedProjekti.kuvaus).to.be.equal(newDescription);
  });
});
