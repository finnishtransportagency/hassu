import { assert, expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { handleEvent } from "../src/apiHandler";
import suunnitelmatDatabase from "../src/database/suunnitelmatDatabase";
import { SuunnitelmaFixture } from "./fixture/suunnitelmaFixture";
import { Suunnitelma } from "../src/api/apiModel";
import { UserFixture } from "./fixture/userFixture";
import { IllegalAccessError } from "../src/error/IllegalAccessError";

describe("apiHandler", () => {
  const userFixture = new UserFixture();

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  describe("handleEvent", () => {
    let fixture: SuunnitelmaFixture;

    let createSuunnitelmaStub: sinon.SinonStub;

    beforeEach(() => {
      createSuunnitelmaStub = sinon.stub(suunnitelmatDatabase, "createSuunnitelma");
      fixture = new SuunnitelmaFixture();
    });

    describe("createSuunnitelma", () => {
      it("should return the expected response", async () => {
        userFixture.loginAs(userFixture.vaylaMatti);

        createSuunnitelmaStub.resolves();

        const result = (await handleEvent({
          info: { fieldName: "createSuunnitelma" },
          arguments: { suunnitelma: fixture.createSuunnitelmaInput },
        } as any)) as Suunnitelma;
        result.id = fixture.SUUNNITELMA_ID_1;
        expect(result).to.deep.equal(fixture.suunnitelma1);
        sinon.assert.calledOnce(createSuunnitelmaStub);
      });

      it("should return error if user has no permissions", async () => {
        userFixture.logout();

        createSuunnitelmaStub.resolves();

        await assert.isRejected(
          handleEvent({
            info: { fieldName: "createSuunnitelma" },
            arguments: { suunnitelma: fixture.createSuunnitelmaInput },
          } as any),
          IllegalAccessError
        );
      });
    });
  });
});
