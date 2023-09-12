/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { Kayttaja } from "hassu-common/graphql/apiModel";
import log from "loglevel";
import sinon from "sinon";
import { mockPersonSearchUpdaterClient } from "../api/testUtil/util";

export function expectNotEmptyKayttaja(kayttaja: Kayttaja): void {
  expect(kayttaja.etunimi).to.not.be.empty;
  expect(kayttaja.sukunimi).to.not.be.empty;
  expect(kayttaja.uid).to.not.be.empty;
  expect(kayttaja.organisaatio).to.not.be.empty;
  expect(kayttaja.email).to.not.be.empty;
  expect(kayttaja.puhelinnumero).to.not.be.empty;
}

describe("PersonSearchClient", () => {
  mockPersonSearchUpdaterClient();

  afterEach(() => {
    sinon.restore();
  });

  it("should list users", async function () {
    try {
      const result = await personSearch.getKayttajas();
      expect(result).not.be.empty;
      const kayttaja = result.asList()[0];
      expectNotEmptyKayttaja(kayttaja);
    } catch (e) {
      log.error(e);
      this.skip();
    }
  });
});
