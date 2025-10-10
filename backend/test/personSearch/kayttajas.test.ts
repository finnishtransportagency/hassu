/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { Kayttajas, Person } from "../../src/personSearch/kayttajas";
import { Kayttaja } from "hassu-common/graphql/apiModel";

import { expect } from "chai";

describe("kayttajas", () => {
  it("should manage list of kayttajas successfully", () => {
    const a1: Person = { etuNimi: "Matti", sukuNimi: "Meikäläinen", email: ["e1@foo.com", "e11@foo.com"] };
    const a2: Person = { etuNimi: "Minna", sukuNimi: "Esimerkkinen", email: ["e2@foo.com"] };
    const a3: Person = { etuNimi: "Nimi", sukuNimi: "Nimetön", email: ["e3@elinvoimakeskus.fi"] };
    const a4: Person = { etuNimi: "Teppo", sukuNimi: "Testaaja", email: ["e4@ely-keskus.fi"] };
    const kayttajaMap = {
      A1: a1,
      A2: a2,
      A3: a3,
      A4: a4,
    };
    const kayttajas = new Kayttajas(kayttajaMap);
    expect(kayttajas.getKayttajaByUid(undefined)).to.eql(undefined);
    const a1Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A1",
      etunimi: "Matti",
      sukunimi: "Meikäläinen",
      email: "e1@foo.com",
    };
    const a2Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A2",
      etunimi: "Minna",
      sukunimi: "Esimerkkinen",
      email: "e2@foo.com",
    };
    const a3Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A3",
      etunimi: "Nimi",
      sukunimi: "Nimetön",
      email: "e3@elinvoimakeskus.fi",
    };
    const a4Kayttaja: Kayttaja = {
      __typename: "Kayttaja",
      uid: "A4",
      etunimi: "Teppo",
      sukunimi: "Testaaja",
      email: "e4@ely-keskus.fi",
    };
    expect(kayttajas.getKayttajaByUid("A1")).to.eql(a1Kayttaja);
    expect(kayttajas.findByText("nen").sort(sortByUidFn)).to.eql([a1Kayttaja, a2Kayttaja]);
    expect(kayttajas.findByText("")).to.eql([]);
    expect(kayttajas.findByEmail("e1@foo.com")).to.eql(a1Kayttaja);
    expect(kayttajas.findByEmail("e11@foo.com")).to.eql(a1Kayttaja);
    expect(kayttajas.findByEmail("e2@foo.com")).to.eql(a2Kayttaja);
    expect(kayttajas.findByEmail("e3@ely-keskus.fi")).to.eql(a3Kayttaja);
    expect(kayttajas.findByEmail("e4@elinvoimakeskus.fi")).to.eql(a4Kayttaja);
    expect(kayttajas.asList().sort(sortByUidFn)).to.eql([a1Kayttaja, a2Kayttaja, a3Kayttaja, a4Kayttaja]);
    expect(kayttajas.asMap()).to.eql(kayttajaMap);
  });
});

const sortByUidFn = (a: Kayttaja, b: Kayttaja) => {
  if (!a.uid || !b.uid) {
    throw new Error("Tried to compare users without usernames");
  }
  return a.uid.localeCompare(b.uid);
};
