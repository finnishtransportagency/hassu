import { describe, it } from "mocha";
import { aineistoKategoriat, kategorisoimattomatId } from "../../../common/aineistoKategoriat";

const { expect } = require("chai");

describe("AineistoKategoria", () => {
  it("should find correct kategoria based on matching", () => {
    const aineistoKategoria = aineistoKategoriat.findKategoria(
      "01 Prosessi/Yleiset/T100 Tiesuunnitelman selostusosa",
      "T119 Kaavakartat, määräykset ja merkinnät.txt"
    );
    expect(aineistoKategoria.id).to.eq("kaavakartat");
    expect(aineistoKategoria.parentKategoria?.id).to.eq("osa_a");

    expect(
      aineistoKategoriat.findKategoria(
        "06 Suunnitelma/Suunnitelmakokonaisuus/T300 Tiesuunnitelman informatiivinen aineisto",
        "T320 Ympäristösuunnitelma.txt"
      ).id
    ).to.eq("ymparistosuunnitelmat");
  });

  it("should return 'kategorisoimaton' when no matches to any other ylakategoria", () => {
    const osaA = aineistoKategoriat.findKategoria("unknown", "unknown");
    expect(osaA.id).to.eq(kategorisoimattomatId);
  });

  it("should match first matching ylakategoria", () => {
    const osaA = aineistoKategoriat.findKategoria("t200 t100", "t200 t100");
    expect(osaA.id).to.eq("osa_a");
    const osaB = aineistoKategoriat.findKategoria("t200 t300", "t200 t300");
    expect(osaB.id).to.eq("osa_b");
  });

  it("should match first matching alakategoria", () => {
    const kaavakartta = aineistoKategoriat.findKategoria("t100 yva kaavakartta", "t100 yva kaavakartta");
    expect(kaavakartta.id).to.eq("kaavakartat");
    expect(kaavakartta.parentKategoria?.id).to.eq("osa_a");
  });

  it("shouldn't match yva if it's surrounded by alphabet", () => {
    const stringsContainingYva = ["hyväksymispäätös", "hyvaksymispaatos"];
    stringsContainingYva.forEach((stringContainingYva) => {
      const kategoria = aineistoKategoriat.findKategoria("t100", stringContainingYva);
      expect(kategoria.id).to.eq("osa_a");
    });
  });

  it("should match yva only if it's surrounded by non-alphabet", () => {
    const shouldMatchYva = [
      "yva",
      "osa_a/yva/",
      "osa_a/yva/materiaali",
      "yva/",
      "/yva",
      "yva(1)",
      "yva-ympäristövaikuksen arvionti",
      "ympäristövaikuksen arvionti (yva)",
    ];
    shouldMatchYva.forEach((stringMatchingYva) => {
      const kategoria = aineistoKategoriat.findKategoria("t100", stringMatchingYva);
      expect(kategoria.id).to.eq("yva");
      expect(kategoria.parentKategoria?.id).to.eq("osa_a");
    });
  });

  it("should match osa_a if it's kuvaus directory path contains 'a' folder", () => {
    const kuvauksetContainingFolderA = ["a", "/a", "a/", "/a/", "tiesuunnitelma/a", "tiesuunnitelma/a/", "tiesuunnitelma/a/aineisto"];
    kuvauksetContainingFolderA.forEach((kuvausContainingFolderA) => {
      const kategoria = aineistoKategoriat.findKategoria(kuvausContainingFolderA, "unknown");
      expect(kategoria.id).to.eq("osa_a");
    });
  });

  it("shouldn't match osa_a if kuvaus contains 'a' folder that contains any other characters", () => {
    const kuvauksetContainingCharacterA = [
      "abc",
      "/aa",
      "aa/",
      "/aa/",
      "tiesuunnitelma/aa",
      "tiesuunnitelma/aa/",
      "tiesuunnitelma/aa/aineisto",
      "a(a)",
      "a1",
    ];
    kuvauksetContainingCharacterA.forEach((kuvausContainingCharacterA) => {
      const kategoria = aineistoKategoriat.findKategoria(kuvausContainingCharacterA, "unknown");
      expect(kategoria.id).to.eq(kategorisoimattomatId);
    });
  });

  it("should match yva only if it's surrounded by non-alphabet", () => {
    const shouldMatchYva = [
      "yva",
      "osa_a/yva/",
      "osa_a/yva/materiaali",
      "yva/",
      "/yva",
      "yva(1)",
      "yva-ympäristövaikuksen arvionti",
      "ympäristövaikuksen arvionti (yva)",
    ];
    shouldMatchYva.forEach((stringMatchingYva) => {
      const kategoria = aineistoKategoriat.findKategoria("t100", stringMatchingYva);
      expect(kategoria.id).to.eq("yva");
      expect(kategoria.parentKategoria?.id).to.eq("osa_a");
    });
  });

  it("should find correct kategoria based on id", () => {
    expect(aineistoKategoriat.findById("kaavakartat")?.id).to.eq("kaavakartat");
  });

  it("should list category tree successfully", () => {
    expect(aineistoKategoriat.listKategoriat()).to.not.be.empty;
    expect(aineistoKategoriat.listKategoriat()[0].alaKategoriat).to.not.be.empty;
  });
});
