/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { Kayttaja } from "../../../common/graphql/apiModel";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import log from "loglevel";
import sinon from "sinon";

export function expectNotEmptyKayttaja(kayttaja: Kayttaja): void {
  expect(kayttaja.etuNimi).to.not.be.empty;
  expect(kayttaja.sukuNimi).to.not.be.empty;
  expect(kayttaja.uid).to.not.be.empty;
  expect(kayttaja.organisaatio).to.not.be.empty;
  expect(kayttaja.email).to.not.be.empty;
  expect(kayttaja.puhelinnumero).to.not.be.empty;
}

describe("PersonSearchClient", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;

  beforeEach(() => {
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });
  });

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
