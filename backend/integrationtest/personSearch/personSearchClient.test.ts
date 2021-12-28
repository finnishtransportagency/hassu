/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { localstackS3Client } from "../util/s3Util";

describe("PersonSearchClient", () => {
  before(() => {
    localstackS3Client();
  });

  it("should list users", async () => {
    const result = await personSearch.getKayttajas();
    expect(result).not.be.empty;
    const kayttaja = result.asList()[0];
    expect(kayttaja.vaylaKayttajaTyyppi).to.not.be.empty;
    expect(kayttaja.etuNimi).to.not.be.empty;
    expect(kayttaja.sukuNimi).to.not.be.empty;
    expect(kayttaja.uid).to.not.be.empty;
    expect(kayttaja.organisaatio).to.not.be.empty;
    expect(kayttaja.email).to.not.be.empty;
    expect(kayttaja.puhelinnumero).to.not.be.empty;
  });
});
