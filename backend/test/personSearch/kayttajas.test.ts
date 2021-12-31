/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { Kayttaja } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("kayttajas", () => {
  it("should manage list of kayttajas successfully", () => {
    const a1: Kayttaja = { __typename: "Kayttaja", uid: "A1", etuNimi: "Matti", sukuNimi: "Meikäläinen" };
    const a2: Kayttaja = { __typename: "Kayttaja", uid: "A2", etuNimi: "Minna", sukuNimi: "Esimerkkinen" };
    const kayttajaMap = {
      A1: a1,
      A2: a2,
    };
    const kayttajas = new Kayttajas(kayttajaMap);
    expect(kayttajas.getKayttajaByUid(undefined)).to.eql(undefined);
    expect(kayttajas.getKayttajaByUid("A1")).to.eql(a1);
    expect(kayttajas.findByText("nen")).to.eql([a1, a2]);
    expect(kayttajas.findByText("")).to.eql([]);
    expect(kayttajas.asList()).to.eql([a1, a2]);
    expect(kayttajas.asMap()).to.eql(kayttajaMap);
  });
});
