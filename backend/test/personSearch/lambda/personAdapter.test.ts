/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { PersonSearchFixture } from "./personSearchFixture";
import { adaptPersonSearchResult } from "../../../src/personSearch/lambda/personSearchAdapter";

const { expect } = require("chai");

describe("personAdapter", () => {
  let searchResultFixture: PersonSearchFixture;

  before(() => {
    searchResultFixture = new PersonSearchFixture();
  });

  it("should adapt person search result succesfully", () => {
    expect(adaptPersonSearchResult(searchResultFixture.pekkaProjariSearchResult)[0]).to.eql(
      searchResultFixture.pekkaProjari
    );
  });

  it("should adapt person search result succesfully", () => {
    expect(adaptPersonSearchResult(searchResultFixture.mattiMeikalainenSearchResult)[0]).to.eql(
      searchResultFixture.mattiMeikalainen
    );
  });
});
