import { describe, it } from "mocha";
import * as sinon from "sinon";
import suunnitelmatDatabase from "../../src/database/suunnitelmatDatabase";
import { SuunnitelmaFixture } from "../fixture/suunnitelmaFixture";
import { DynamoDB } from "aws-sdk";
import { toMatchSnapshot } from "../util/expect-mocha-snapshot";

import * as expect from "expect";

expect.extend({ toMatchSnapshot });

describe("apiHandler", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe("updateSuunnitelma", () => {
    let fixture: SuunnitelmaFixture;

    let updateStub: sinon.SinonStub;

    beforeEach(() => {
      updateStub = sinon.stub(DynamoDB.DocumentClient.prototype, "update");
      // listSuunnitelmatStub = sinon.stub(suunnitelmatDatabase, "listSuunnitelmat");
    });

    beforeEach(() => {
      fixture = new SuunnitelmaFixture();
    });

    describe("updateSuunnitelma", () => {
      it("should pass expected parameters to DynamoDB", async function () {
        updateStub.returns({
          promise() {
            return Promise.resolve({});
          },
        });

        await suunnitelmatDatabase.updateSuunnitelma(fixture.suunnitelma1);

        sinon.assert.calledOnce(updateStub);
        const call = updateStub.getCall(0);
        expect(call.firstArg).toMatchSnapshot(this as any);
      });
    });
  });
});
