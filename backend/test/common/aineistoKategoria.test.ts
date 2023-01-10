// @ts-nocheck
import { describe, it } from "mocha";
import { aineistoKategoriat } from "../../../common/aineistoKategoriat";

const { expect } = require("chai");

describe("AineistoKategoria", () => {
  it("should find correct kategoria based on matching", () => {
    const aineistoKategoria = aineistoKategoriat.findKategoria(
      "osa_a",
      "01 Prosessi/Yleiset/T100 Tiesuunnitelman selostusosa",
      "T119 Kaavakartat, määräykset ja merkinnät.txt"
    );
    expect(aineistoKategoria.id).to.eq("kaavakartat");
    expect(aineistoKategoria.parentKategoria.id).to.eq("osa_a");

    expect(
      aineistoKategoriat.findKategoria(
        "osa_c",
        "06 Suunnitelma/Suunnitelmakokonaisuus/T300 Tiesuunnitelman informatiivinen aineisto",
        "T320 Ympäristösuunnitelma.txt"
      ).id
    ).to.eq("ymparistosuunnitelmat");
  });

  it("should find correct kategoria based on id", () => {
    expect(aineistoKategoriat.findById("kaavakartat").id).to.eq("kaavakartat");
  });

  it("should list category tree successfully", () => {
    expect(aineistoKategoriat.listKategoriat()).to.not.be.empty;
    expect(aineistoKategoriat.listKategoriat()[0].alaKategoriat).to.not.be.empty;
  });
});
