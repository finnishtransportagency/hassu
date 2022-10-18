import { describe, it } from "mocha";
import { adaptProjekti, findUpdatedFields } from "../../src/velho/velhoAdapter";
import { default as velhoTieProjecti } from "./fixture/velhoTieProjekti.json";
import cloneDeep from "lodash/cloneDeep";
import { Velho } from "../../src/database/model";
import { ProjektiProjekti } from "../../src/velho/projektirekisteri";

const { expect } = require("chai");

describe("VelhoAdapter", () => {
  it("should adapt project from Velho successfully", async () => {
    expect(adaptProjekti(velhoTieProjecti.data as unknown as ProjektiProjekti)).toMatchSnapshot();
  });

  it("should adapt project with kunta and maakunta keys from Velho successfully", async () => {
    let velhoData = cloneDeep(velhoTieProjecti.data as unknown as ProjektiProjekti);
    velhoData.ominaisuudet.kunta = new Set<object>(["kunta/kunta049", "kunta/kunta092", "kunta/kunta091"] as unknown as object[]);
    delete velhoData.ominaisuudet["muu-kunta"];

    velhoData.ominaisuudet.maakunta = new Set<object>(["maakunta/maakunta001"] as unknown as object[]);
    delete velhoData.ominaisuudet["muu-maakunta"];
    expect(adaptProjekti(velhoData)).toMatchSnapshot();
  });

  it("should find updated Velho fields successfully", async () => {
    const oldVelho: Velho = adaptProjekti(velhoTieProjecti.data as unknown as ProjektiProjekti).velho!;
    const newVelho: Velho = cloneDeep(oldVelho);
    newVelho.nimi = "Uusi nimi";
    newVelho.vaylamuoto = ["rata"];
    newVelho.vastuuhenkilonEmail = "uusi@vayla.fi";
    const differencies = findUpdatedFields(oldVelho, newVelho);
    expect(differencies).toMatchSnapshot();
  });
});
