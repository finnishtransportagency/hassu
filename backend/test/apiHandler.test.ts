import { expect } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { handleEvent } from "../src/apiHandler";
import suunnitelmatDatabase from "../src/database/suunnitelmatDatabase";
import { SuunnitelmaFixture } from "./fixture/suunnitelmaFixture";
import { Suunnitelma } from "../src/api/apiModel";

describe("apiHandler", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe("handleEvent", () => {
    let fixture: SuunnitelmaFixture;

    let createSuunnitelmaStub: sinon.SinonStub;
    // let listSuunnitelmatStub: sinon.SinonStub;

    beforeEach(() => {
      createSuunnitelmaStub = sinon.stub(suunnitelmatDatabase, "createSuunnitelma");
      // listSuunnitelmatStub = sinon.stub(suunnitelmatDatabase, "listSuunnitelmat");
    });

    beforeEach(() => {
      fixture = new SuunnitelmaFixture();
    });

    describe("createSuunnitelma", () => {
      it("should return the expected response", async () => {
        createSuunnitelmaStub.resolves();

        const result = (await handleEvent({
          info: { fieldName: "createSuunnitelma" },
          arguments: { suunnitelma: fixture.createSuunnitelmaInput },
        } as any)) as Suunnitelma;
        result.id = fixture.SUUNNITELMA_ID_1;
        expect(result).to.deep.equal(fixture.suunnitelma1);
        sinon.assert.calledOnce(createSuunnitelmaStub);
      });
    });
  });
});
