import { describe, it } from "mocha";
import { aineistoKategoriat } from "../../../common/aineistoKategoriat";

const { expect } = require("chai");

describe("AineistoKategoria", () => {
  it("should find correct kategoria based on matching", () => {
    const aineistoKategoria = aineistoKategoriat.findKategoria(
      "01 Prosessi/Yleiset/T100 Tiesuunnitelman selostusosa",
      "T119 Kaavakartat, määräykset ja merkinnät.txt"
    );
    expect(aineistoKategoria.id).to.eq("TBD101");
    expect(aineistoKategoria.parentKategoria.id).to.eq("T1xx");

    expect(
      aineistoKategoriat.findKategoria(
        "06 Suunnitelma/Suunnitelmakokonaisuus/T300 Tiesuunnitelman informatiivinen aineisto",
        "T320 Ympäristösuunnitelma.txt"
      ).id
    ).to.eq("TBD306");
  });

  it("should find correct kategoria based on id", () => {
    expect(aineistoKategoriat.findById("TBD101").id).to.eq("TBD101");
  });

  it("should list category tree successfully", () => {
    expect(aineistoKategoriat.listKategoriat()).to.not.be.empty;
    expect(aineistoKategoriat.listKategoriat()[0].alaKategoriat).to.not.be.empty;
  });
});
