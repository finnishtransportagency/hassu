// @ts-nocheck
import { describe, it } from "mocha";
import { findUpdatesFromVelho, synchronizeUpdatesFromVelho } from "../../src/projekti/projektiHandler";
import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { velho } from "../../src/velho/velhoClient";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";

const { expect } = require("chai");

describe("projektiHandler", () => {
  let fixture: ProjektiFixture;
  let saveProjektiStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  let userFixture: UserFixture;

  beforeEach(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");

    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    userFixture = new UserFixture(userService);
    fixture = new ProjektiFixture();
    sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(fixture.dbProjekti1());
    const updatedProjekti = fixture.dbProjekti1();
    const velhoData = updatedProjekti.velho;
    velhoData.nimi = "Uusi nimi";
    velhoData.vaylamuoto = ["rata"];
    velhoData.vastuuhenkilonEmail = a1User.email;
    velhoData.varahenkilonEmail = a2User.email;
    loadVelhoProjektiByOidStub.resolves(updatedProjekti);
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
