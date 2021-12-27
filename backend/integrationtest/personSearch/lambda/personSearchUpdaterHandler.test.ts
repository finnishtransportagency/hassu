import { describe, it } from "mocha";
import { handleEvent } from "../../../src/personSearch/lambda/personSearchUpdaterHandler";
import * as sinon from "sinon";
import { personSearchUpdater } from "../../../src/personSearch/lambda/personSearchUpdater";
import { PersonSearchFixture } from "../../../test/personSearch/lambda/personSearchFixture";
import { localstackS3Client } from "../../util/s3Util";

describe("PersonSearchUpdaterHandler", () => {
  let listAccountsStub: sinon.SinonStub;

  before(() => {
    localstackS3Client();
  });

  beforeEach(() => {
    listAccountsStub = sinon.stub(personSearchUpdater, "listAccounts");
  });

  after(() => {
    sinon.restore();
  });

  it("should run handler successfully", async () => {
    listAccountsStub.resolves([new PersonSearchFixture().pekkaProjari]);
    await handleEvent();
  });
});
