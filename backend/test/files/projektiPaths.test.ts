/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const { expect } = require("chai");

describe("ProjektiPaths", () => {
  it("should create yllapito paths successfully", function () {
    expect([
      new ProjektiPaths("123").yllapitoPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).yllapitoPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).yllapitoPath,
    ]).toMatchSnapshot();
  });

  it("should create public projekti relative paths successfully", function () {
    expect([
      new ProjektiPaths("123").publicPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).publicPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.publicPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).publicPath,
    ]).toMatchSnapshot();
  });

  it("should create public full paths successfully", function () {
    expect([
      new ProjektiPaths("123").publicFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).publicFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.publicFullPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).publicFullPath,
    ]).toMatchSnapshot();
  });
});
