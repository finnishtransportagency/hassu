import { describe, it } from "mocha";
import { kuntametadata } from "./kuntametadata";

import { expect } from "chai";

describe("Metadata", () => {
  it("should have metadata for Tampere and Pirkanmaa", () => {
    const tampere = kuntametadata.kuntaForKuntaId(837);
    expect(tampere).to.not.be.undefined;
    expect(tampere).to.eql({
      ely: "ely/ely05",
      id: 837,
      liikennevastuuEly: "ely/ely05",
      maakunta: "maakunta/maakunta06",
      nimi: {
        SUOMI: "Tampere",
        RUOTSI: "Tammerfors",
      },
    });

    const pirkanmaa = kuntametadata.maakuntaForMaakuntaId(6);
    expect(pirkanmaa).to.eql({
      id: "maakunta/maakunta06",
      koodi: "06",
      liittoNimi: "Pirkanmaan liitto",
      nimi: {
        RUOTSI: "Birkaland",
        SUOMI: "Pirkanmaa",
      },
    });

    expect(tampere!.maakunta).to.eq(pirkanmaa!.id);
  });

  it("should tolerate upper-, and lowercase variations", () => {
    const joroinen = kuntametadata.idForKuntaName("JOROINEN");
    expect(joroinen).to.eq(171);
  });

  it("should handle ely lyhenne to ely successfully", () => {
    const uud = kuntametadata.elyIdFromKey("UUD");
    expect(uud).to.eq("ely/ely01");
  });

  it("should render maakuntaoptions correctly", () => {
    expect(
      kuntametadata
        .maakuntaOptions("fi")
        .filter((opt) => opt.label.includes("Uusimaa"))
        .pop()
    ).to.eql({ label: "Uusimaa", value: "1" });
  });
});
