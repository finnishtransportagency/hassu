import { describe, it } from "mocha";
import { findUpdatesFromVelho, synchronizeUpdatesFromVelho } from "../../src/projekti/projektiHandler";
import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { velho } from "../../src/velho/velhoClient";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";

const { expect } = require("chai");

describe("projektiHandler", () => {
  let fixture: ProjektiFixture;
  let loadProjektiByOidStub: sinon.SinonStub;
  let saveProjektiStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  let userFixture: UserFixture;

  beforeEach(() => {
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");

    userFixture = new UserFixture(userService);
    fixture = new ProjektiFixture();
    loadProjektiByOidStub.resolves(fixture.dbProjekti1());
    const updatedProjekti = fixture.dbProjekti1();
    const velhoData = updatedProjekti.velho;
    velhoData.nimi = "Uusi nimi";
    velhoData.vaylamuoto = ["rata"];
    velhoData.vastuuhenkilonEmail = "uusi@vayla.fi";
    loadVelhoProjektiByOidStub.resolves({ projekti: updatedProjekti, vastuuhenkilo: "TBD" });
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should detect Velho changes successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const velhoUpdates = await findUpdatesFromVelho("1");
    expect(velhoUpdates).toMatchSnapshot();
  });

  it("should update Velho changes successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce);
    expect(saveProjektiStub.getCall(0).firstArg).toMatchSnapshot();
  });
});
