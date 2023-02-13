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
import { KayttajaTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";

const { expect } = require("chai");

describe("projektiHandler", () => {
  let fixture: ProjektiFixture;
  let saveProjektiStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  let userFixture: UserFixture;
  let loadProjektiByOid: sinon.SinonStub;
  beforeEach(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjektiWithoutLocking");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");

    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    userFixture = new UserFixture(userService);
    fixture = new ProjektiFixture();

    loadProjektiByOid = sinon.stub(projektiDatabase, "loadProjektiByOid");
    loadProjektiByOid.resolves(fixture.dbProjekti1());
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

  it("should not allow kunnanEdustaja from being removed, when doing synchronizeUpdatesFromVelho, when kunnanEdustaja is Projektipäällikkö", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projariKunnanEdustajana: DBProjekti = fixture.dbProjekti1();
    const projari = projariKunnanEdustajana.kayttoOikeudet.find((user) => user.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    projariKunnanEdustajana.suunnitteluSopimus = {
      yhteysHenkilo: projari?.kayttajatunnus,
      kunta: 1,
      logo: "logo.gif",
    };
    loadProjektiByOid.reset();
    loadProjektiByOid.resolves(projariKunnanEdustajana);
    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce);
    expect(saveProjektiStub.getCall(0).firstArg.kayttoOikeudet.length).eql(6);
  });

  it("should not allow kunnanEdustaja from being removed, when doing synchronizeUpdatesFromVelho, when kunnan Edustaja is Varahenkilö", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const varahenkiloKunnanEdustajana: DBProjekti = fixture.dbProjekti1();
    varahenkiloKunnanEdustajana.kayttoOikeudet[1].tyyppi = KayttajaTyyppi.VARAHENKILO; // tehdään Matti Meikäläisestä varahenkilö
    const varahenkilo = varahenkiloKunnanEdustajana.kayttoOikeudet[1];
    varahenkiloKunnanEdustajana.suunnitteluSopimus = {
      yhteysHenkilo: varahenkilo?.kayttajatunnus,
      kunta: 1,
      logo: "logo.gif",
    };
    loadProjektiByOid.reset();
    loadProjektiByOid.resolves(varahenkiloKunnanEdustajana);
    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce);
    expect(saveProjektiStub.getCall(0).firstArg.kayttoOikeudet.length).eql(5);
  });
});
