import { describe, it } from "mocha";
import { getAineistoKategoriat, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";

import { expect } from "chai";
import { ProjektiTyyppi } from "hassu-common/graphql/apiModel";

describe("AineistoKategoria", () => {
  it("should find correct kategoria based on matching", () => {
    const aineistoKategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
      "01 Prosessi/Yleiset/T100 Tiesuunnitelman selostusosa",
      "T119 Kaavakartat, määräykset ja merkinnät.txt"
    );
    expect(aineistoKategoria.id).to.eq("kaavakartat");
    expect(aineistoKategoria.parentKategoria?.id).to.eq("osa_a");

    expect(
      getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE }).findKategoria(
        "06 Suunnitelma/Suunnitelmakokonaisuus/T300 Tiesuunnitelman informatiivinen aineisto",
        "T320 Ympäristösuunnitelma.txt"
      ).id
    ).to.eq("ymparistosuunnitelmat");
  });

  it("should return 'kategorisoimaton' when no matches to any other ylakategoria", () => {
    const osaA = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
      "unknown",
      "unknown"
    );
    expect(osaA.id).to.eq(kategorisoimattomatId);
  });

  it("should match first matching ylakategoria", () => {
    const osaA = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
      "t200 t100",
      "t200 t100"
    );
    expect(osaA.id).to.eq("osa_a");
    const osaB = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
      "t200 t300",
      "t200 t300"
    );
    expect(osaB.id).to.eq("osa_b");
  });

  it("should match first matching alakategoria", () => {
    const kaavakartta = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
      "t100 yva kaavakartta",
      "t100 yva kaavakartta"
    );
    expect(kaavakartta.id).to.eq("kaavakartat");
    expect(kaavakartta.parentKategoria?.id).to.eq("osa_a");
  });

  it("shouldn't match yva if it's surrounded by alphabet", () => {
    const stringsContainingYva = ["hyväksymispäätös", "hyvaksymispaatos"];
    stringsContainingYva.forEach((stringContainingYva) => {
      const kategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
        "t100",
        stringContainingYva
      );
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
      const kategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
        "t100",
        stringMatchingYva
      );
      expect(kategoria.id).to.eq("yva");
      expect(kategoria.parentKategoria?.id).to.eq("osa_a");
    });
  });

  it("should match osa_a if it's kuvaus directory path contains 'a' folder", () => {
    const kuvauksetContainingFolderA = ["a", "/a", "a/", "/a/", "tiesuunnitelma/a", "tiesuunnitelma/a/", "tiesuunnitelma/a/aineisto"];
    kuvauksetContainingFolderA.forEach((kuvausContainingFolderA) => {
      const kategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
        kuvausContainingFolderA,
        "unknown"
      );
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
      const kategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
        kuvausContainingCharacterA,
        "unknown"
      );
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
      const kategoria = getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findKategoria(
        "t100",
        stringMatchingYva
      );
      expect(kategoria.id).to.eq("yva");
      expect(kategoria.parentKategoria?.id).to.eq("osa_a");
    });
  });

  it("should find correct kategoria based on id", () => {
    expect(getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).findById("kaavakartat")?.id).to.eq(
      "kaavakartat"
    );
  });

  it("should list category tree successfully", () => {
    expect(getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).listKategoriat()).to.not.be.empty;
    expect(getAineistoKategoriat({ projektiTyyppi: ProjektiTyyppi.TIE, showKategorisoimattomat: true }).listKategoriat()[0].alaKategoriat)
      .to.not.be.empty;
  });
});
