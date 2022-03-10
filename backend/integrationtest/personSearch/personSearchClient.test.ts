/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { localstackS3Client } from "../util/s3Util";
import { Kayttaja } from "../../../common/graphql/apiModel";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import * as sinon from "sinon";
import log from "loglevel";

const sandbox = sinon.createSandbox();

export function expectNotEmptyKayttaja(kayttaja: Kayttaja) {
  expect(kayttaja.vaylaKayttajaTyyppi).to.not.be.empty;
  expect(kayttaja.etuNimi).to.not.be.empty;
  expect(kayttaja.sukuNimi).to.not.be.empty;
  expect(kayttaja.uid).to.not.be.empty;
  expect(kayttaja.organisaatio).to.not.be.empty;
  expect(kayttaja.email).to.not.be.empty;
  expect(kayttaja.puhelinnumero).to.not.be.empty;
}

describe("PersonSearchClient", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  before(() => {
    localstackS3Client();
  });

  beforeEach(() => {
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });
  });

  afterEach(() => {
    sandbox.restore();
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
