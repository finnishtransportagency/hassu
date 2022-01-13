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
    expect(kayttajas).to.eql({
      A123: {
        email: ["pekka.projari@vayla.fi"],
        etuNimi: "Pekka",
        organisaatio: "Väylävirasto",
        puhelinnumero: "123456789",
        sukuNimi: "Projari",
        vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
      } as Person,
    });
  });

  it("should adapt person search result succesfully", () => {
    const kayttajas = {};
    adaptPersonSearchResult(searchResultFixture.mattiMeikalainenSearchResult, kayttajas);
    expect(kayttajas).to.eql({
      A000111: {
        email: ["matti.meikalainen@vayla.fi"],
        etuNimi: "Matti",
        organisaatio: "ELY",
        puhelinnumero: "123456789",
        sukuNimi: "Meikäläinen",
        vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
      } as Person,
    });
  });
});
