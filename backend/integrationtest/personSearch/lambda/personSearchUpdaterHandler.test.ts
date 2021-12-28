import { describe, it } from "mocha";
import { handleEvent } from "../../../src/personSearch/lambda/personSearchUpdaterHandler";
import * as sinon from "sinon";
import { personSearchUpdater } from "../../../src/personSearch/lambda/personSearchUpdater";
import { PersonSearchFixture } from "../../../test/personSearch/lambda/personSearchFixture";
import { localstackS3Client } from "../../util/s3Util";
import { Kayttajas } from "../../../src/personSearch/kayttajas";

describe("PersonSearchUpdaterHandler", () => {
  let getKayttajasStub: sinon.SinonStub;

  before(() => {
    localstackS3Client();
  });

  beforeEach(() => {
    getKayttajasStub = sinon.stub(personSearchUpdater, "getKayttajas");
  });

  after(() => {
    sinon.restore();
  });

  it("should run handler successfully", async () => {
    getKayttajasStub.resolves(Kayttajas.fromKayttajaList([new PersonSearchFixture().pekkaProjari]));
    await handleEvent();
  });
});
