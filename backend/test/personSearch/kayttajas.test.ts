/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { Kayttajas, Person } from "../../src/personSearch/kayttajas";
import { Kayttaja } from "hassu-common/graphql/apiModel";

import { expect } from "chai";

describe("kayttajas", () => {
  it("should manage list of kayttajas successfully", () => {
    const a1: Person = { etuNimi: "Matti", sukuNimi: "Meikäläinen", email: ["e1", "e11"] };
    const a2: Person = { etuNimi: "Minna", sukuNimi: "Esimerkkinen", email: ["e2"] };
    const kayttajaMap = {
      A1: a1,
      A2: a2,
    };
    const kayttajas = new Kayttajas(kayttajaMap);
    expect(kayttajas.getKayttajaByUid(undefined)).to.eql(undefined);
    const a1Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A1",
      etunimi: "Matti",
      sukunimi: "Meikäläinen",
      email: "e1",
    };
    const a2Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A2",
      etunimi: "Minna",
      sukunimi: "Esimerkkinen",
      email: "e2",
    };
    expect(kayttajas.getKayttajaByUid("A1")).to.eql(a1Kayttaja);
    expect(kayttajas.findByText("nen").sort(sortByUidFn)).to.eql([a1Kayttaja, a2Kayttaja]);
    expect(kayttajas.findByText("")).to.eql([]);
    expect(kayttajas.findByEmail("e1")).to.eql(a1Kayttaja);
    expect(kayttajas.findByEmail("e11")).to.eql(a1Kayttaja);
    expect(kayttajas.findByEmail("e2")).to.eql(a2Kayttaja);
    expect(kayttajas.asList().sort(sortByUidFn)).to.eql([a1Kayttaja, a2Kayttaja]);
    expect(kayttajas.asMap()).to.eql(kayttajaMap);
  });
});

const sortByUidFn = (a: Kayttaja, b: Kayttaja) => {
  if (!a.uid || !b.uid) {
    throw new Error("Tried to compare users without usernames");
  }
  return a.uid.localeCompare(b.uid);
};
