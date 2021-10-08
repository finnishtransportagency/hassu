import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { DynamoDB } from "aws-sdk";

const { expect } = require("chai");

describe("apiHandler", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe("updateSuunnitelma", () => {
    let fixture: ProjektiFixture;

    let updateStub: sinon.SinonStub;
    let scanStub: sinon.SinonStub;

    beforeEach(() => {
      updateStub = sinon.stub(DynamoDB.DocumentClient.prototype, "update");
      scanStub = sinon.stub(DynamoDB.DocumentClient.prototype, "scan");
    });

    beforeEach(() => {
      fixture = new ProjektiFixture();
    });

    describe("saveProjekti", () => {
      it("should pass expected parameters to DynamoDB", async () => {
        updateStub.returns({
          promise() {
            return Promise.resolve({});
          },
        });

        await projektiDatabase.saveProjekti(fixture.dbProjekti1);

        sinon.assert.calledOnce(updateStub);
        expect(updateStub.getCall(0).firstArg).toMatchSnapshot();
      });

      it("should return items from listProjektit call", async () => {
        scanStub.returns({
          promise() {
            return Promise.resolve({
              Items: [
                { oid: 1, kuvaus: "description 1" },
                { oid: 2, kuvaus: "description 2" },
              ],
            });
          },
        });

        await projektiDatabase.listProjektit();

        sinon.assert.calledOnce(scanStub);
      });
    });
  });
});
