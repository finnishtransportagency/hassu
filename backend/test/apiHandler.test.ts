import { assert } from "chai";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../src/database/projektiDatabase";
import { ProjektiFixture } from "./fixture/projektiFixture";
import { UserFixture } from "./fixture/userFixture";
import { IllegalAccessError } from "../src/error/IllegalAccessError";
import { velho } from "../src/velho/velhoClient";
import { TallennaProjektiInput } from "../../common/graphql/apiModel";
import { api } from "../integrationtest/api/apiClient";

const { expect } = require("chai");

describe("apiHandler", () => {
  const userFixture = new UserFixture();

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  describe("handleEvent", () => {
    let fixture: ProjektiFixture;

    let createProjektiStub: sinon.SinonStub;
    let saveProjektiStub: sinon.SinonStub;
    let loadProjektiByOidStub: sinon.SinonStub;
    let loadVelhoProjektiByOidStub: sinon.SinonStub;

    beforeEach(() => {
      createProjektiStub = sinon.stub(projektiDatabase, "createProjekti");
      saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
      loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
      loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");

      fixture = new ProjektiFixture();
    });

    describe("tallennaProjekti", () => {
      it("should create a new project", async () => {
        userFixture.loginAs(userFixture.vaylaMatti);

        loadProjektiByOidStub.resolves();
        loadVelhoProjektiByOidStub.resolves(fixture.projekti1);
        createProjektiStub.resolves();

        await api.tallennaProjekti(fixture.tallennaProjektiInput);
        sinon.assert.calledOnce(loadProjektiByOidStub);
        sinon.assert.calledOnce(loadVelhoProjektiByOidStub);
        sinon.assert.calledOnce(createProjektiStub);
        expect(createProjektiStub.getCall(0).firstArg).toMatchSnapshot();
      });

      it("should update an existing project", async () => {
        userFixture.loginAs(userFixture.vaylaMatti);

        loadProjektiByOidStub.resolves(fixture.dbProjekti1);
        saveProjektiStub.resolves();

        const input: TallennaProjektiInput = {
          kuvaus: fixture.PROJEKTI1_KUVAUS_2,
          ...fixture.tallennaProjektiInput,
        };
        await api.tallennaProjekti(input);
        sinon.assert.calledOnce(loadProjektiByOidStub);
        sinon.assert.calledOnce(saveProjektiStub);
        expect(saveProjektiStub.getCall(0).firstArg).toMatchSnapshot();
      });

      it("should return error if user has no permissions", async () => {
        userFixture.logout();

        createProjektiStub.resolves();

        await assert.isRejected(api.tallennaProjekti(fixture.tallennaProjektiInput), IllegalAccessError);
      });
    });
  });
});
