/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const { expect } = require("chai");

describe("ProjektiPaths", () => {
  it("should create yllapito paths successfully", function () {
    expect([
      new ProjektiPaths("123").yllapitoPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).yllapitoPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).kutsu.yllapitoPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.yllapitoPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).yllapitoPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).yllapitoPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).paatos.yllapitoPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).yllapitoPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).paatos.yllapitoPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).yllapitoPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).paatos.yllapitoPath,
    ]).toMatchSnapshot();
  });

  it("should create yllapito full paths successfully", function () {
    expect([
      new ProjektiPaths("123").yllapitoFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).yllapitoFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).kutsu.yllapitoFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.yllapitoFullPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).yllapitoFullPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).yllapitoFullPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).paatos.yllapitoFullPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).yllapitoFullPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).paatos.yllapitoFullPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).yllapitoFullPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).paatos.yllapitoFullPath,
    ]).toMatchSnapshot();
  });

  it("should create public projekti relative paths successfully", function () {
    expect([
      new ProjektiPaths("123").publicPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).publicPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.publicPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).kutsu.publicPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).publicPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).publicPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).paatos.publicPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).publicPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).paatos.publicPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).publicPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).paatos.publicPath,
    ]).toMatchSnapshot();
  });

  it("should create public full paths successfully", function () {
    expect([
      new ProjektiPaths("123").publicFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).publicFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).aineisto.publicFullPath,
      new ProjektiPaths("123").vuorovaikutus({ vuorovaikutusNumero: 456 }).kutsu.publicFullPath,
      new ProjektiPaths("123").nahtavillaoloVaihe({ id: 7 }).publicFullPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).publicFullPath,
      new ProjektiPaths("123").hyvaksymisPaatosVaihe({ id: 8 }).paatos.publicFullPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).publicFullPath,
      new ProjektiPaths("123").jatkoPaatos1Vaihe({ id: 8 }).paatos.publicFullPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).publicFullPath,
      new ProjektiPaths("123").jatkoPaatos2Vaihe({ id: 8 }).paatos.publicFullPath,
    ]).toMatchSnapshot();
  });
});
