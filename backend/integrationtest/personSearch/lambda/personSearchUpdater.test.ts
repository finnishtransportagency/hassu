/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearchUpdater } from "../../../src/personSearch/lambda/personSearchUpdater";
import { expectNotEmptyKayttaja } from "../personSearchClient.test";

describe("PersonSearchUpdater", () => {
  it("should update list of users", async () => {
    const result = (await personSearchUpdater.getKayttajas()).asList();
    expect(result).not.be.empty;
    const kayttaja = result[0];
    expectNotEmptyKayttaja(kayttaja);
  });
});
