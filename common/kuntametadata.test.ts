import { describe, it } from "mocha";
import { kuntametadata } from "./kuntametadata";

const { expect } = require("chai");

describe("Metadata", () => {
  it("should have metadata for Tampere and Pirkanmaa", () => {
    const tampere = kuntametadata.kuntaForKuntaId(837);
    expect(tampere).to.not.be.undefined;
    expect(tampere).to.eql({
      elyId: 5,
      id: 837,
      liikennevastuuElyId: 5,
      maakuntaId: 6,
      nimi: {
        SUOMI: "Tampere",
        RUOTSI: "Tammerfors",
      },
    });

    const pirkanmaa = kuntametadata.maakuntaForMaakuntaId(6);
    expect(pirkanmaa).to.eql({
      id: 6,
      nimi: {
        RUOTSI: "Birkaland",
        SUOMI: "Pirkanmaa",
      },
    });

    expect(tampere!.maakuntaId).to.eq(pirkanmaa!.id);
  });
});
