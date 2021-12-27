/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearchUpdater } from "../../../src/personSearch/lambda/personSearchUpdater";

describe("PersonSearchUpdater", () => {
  it("should update list of users", async () => {
    const result = await personSearchUpdater.listAccounts();
    expect(result).not.be.empty;
    const kayttaja = result[0];
    expect(kayttaja.vaylaKayttajaTyyppi).to.not.be.empty;
    expect(kayttaja.etuNimi).to.not.be.empty;
    expect(kayttaja.sukuNimi).to.not.be.empty;
    expect(kayttaja.uid).to.not.be.empty;
    expect(kayttaja.organisaatio).to.not.be.empty;
    expect(kayttaja.email).to.not.be.empty;
    expect(kayttaja.puhelinnumero).to.not.be.empty;
  });
});
