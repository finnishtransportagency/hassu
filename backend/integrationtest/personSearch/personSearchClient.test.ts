/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearch } from "../../src/personSearch/personSearchClient";

describe("PersonSearchClient", () => {
  it("should list users", async () => {
    const result = await personSearch.listAccounts();
    expect(result).not.be.empty;
    const kayttaja = result[0];
    expect(kayttaja.vaylaKayttaja).to.be.true;
    expect(kayttaja.etuNimi).to.not.be.empty;
    expect(kayttaja.sukuNimi).to.not.be.empty;
    expect(kayttaja.uid).to.not.be.empty;
    expect(kayttaja.organisaatio).to.not.be.empty;
    expect(kayttaja.email).to.not.be.empty;
    expect(kayttaja.puhelinnumero).to.not.be.empty;
  });
});
