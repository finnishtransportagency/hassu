import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import DynamoDB from "aws-sdk/clients/dynamodb";
import { DBProjekti } from "../../src/database/model/projekti";

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
        const updateCommand = updateStub.getCall(0).firstArg;
        updateCommand.ExpressionAttributeValues[":paivitetty"] = "2022-03-15T14:29:48.845Z";
        expect(updateCommand).toMatchSnapshot();
      });

      it("should remove null fields from DynamoDB", async () => {
        updateStub.returns({
          promise() {
            return Promise.resolve({});
          },
        });

        const projekti: DBProjekti = {
          oid: fixture.dbProjekti1.oid,
          muistiinpano: "foo",
          suunnitteluSopimus: null,
        } as DBProjekti;
        await projektiDatabase.saveProjekti(projekti);

        sinon.assert.calledOnce(updateStub);
        const updateCommand = updateStub.getCall(0).firstArg;
        updateCommand.ExpressionAttributeValues[":paivitetty"] = "2022-03-15T14:29:48.845Z";
        expect(updateCommand).toMatchSnapshot();
      });

      it("should return items from listProjektit call", async () => {
        scanStub.returns({
          promise() {
            return Promise.resolve({
              Items: [
                { oid: 1, muistiinpano: "note 1" },
                { oid: 2, muistiinpano: "note 2" },
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
