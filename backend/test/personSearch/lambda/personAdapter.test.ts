/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { PersonSearchFixture } from "./personSearchFixture";
import { adaptPersonSearchResult } from "../../../src/personSearch/lambda/personSearchAdapter";
import { Person } from "../../../src/personSearch/kayttajas";
import { VaylaKayttajaTyyppi } from "../../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("personAdapter", () => {
  let searchResultFixture: PersonSearchFixture;

  before(() => {
    searchResultFixture = new PersonSearchFixture();
  });

  it("should adapt person search result succesfully", () => {
    const kayttajas = {};
    adaptPersonSearchResult(searchResultFixture.pekkaProjariSearchResult, kayttajas);
    const person: Person = {
      email: ["pekka.projari@vayla.fi"],
      etuNimi: "Pekka",
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
      sukuNimi: "Projari",
      vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
    };
    expect(kayttajas).to.eql({
      A123: person,
    });
  });

  it("should adapt person search result succesfully", () => {
    const kayttajas = {};
    adaptPersonSearchResult(searchResultFixture.mattiMeikalainenSearchResult, kayttajas);
    const person: Person = {
      email: ["matti.meikalainen@vayla.fi"],
      etuNimi: "Matti",
      organisaatio: "ELY",
      puhelinnumero: "123456789",
      sukuNimi: "Meikäläinen",
      vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
    };
    expect(kayttajas).to.eql({
      A000111: person,
    });
  });
});
