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
import { Kayttaja, KayttajaTyyppi } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import { assertIsDefined } from "../../src/util/assertions";
import { expect } from "chai";
import { parameters } from "../../src/aws/parameters";

describe("projektiHandler", () => {
  let fixture: ProjektiFixture;
  let saveProjektiStub: sinon.SinonStub;
  let loadVelhoProjektiByOidStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let loadProjektiByOid: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let isAsianhallintaIntegrationEnabledStub: sinon.SinonStub;
  let isUspaIntegrationEnabledStub: sinon.SinonStub;
  let a1User: Kayttaja;
  let a2User: Kayttaja;
  let x1User: Kayttaja;

  beforeEach(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjektiWithoutLocking");
    loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");
    isAsianhallintaIntegrationEnabledStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled");
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");

    const personSearchFixture = new PersonSearchFixture();
    a1User = personSearchFixture.createKayttaja("A1");
    a2User = personSearchFixture.createKayttaja("A2");
    x1User = personSearchFixture.createKayttaja("X1");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    getKayttajasStub.resolves(Kayttajas.fromKayttajaList([a1User, a2User, x1User]));

    fixture = new ProjektiFixture();

    loadProjektiByOid = sinon.stub(projektiDatabase, "loadProjektiByOid");
    loadProjektiByOid.resolves(fixture.dbProjekti1());
  });

  function mockLoadVelhoProjektiByOid() {
    const updatedProjekti = fixture.dbProjekti1();
    const velhoData = updatedProjekti.velho;
    assertIsDefined(velhoData);
    velhoData.nimi = "Uusi nimi";
    velhoData.vaylamuoto = ["rata"];
    velhoData.vastuuhenkilonEmail = a1User.email;
    velhoData.varahenkilonEmail = a2User.email;
    loadVelhoProjektiByOidStub.resolves(updatedProjekti);
  }

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should detect Velho changes successfully", async () => {
    mockLoadVelhoProjektiByOid();
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const velhoUpdates = await findUpdatesFromVelho("1");
    expect(velhoUpdates).toMatchSnapshot();
  });

  it("should update Velho changes successfully", async () => {
    mockLoadVelhoProjektiByOid();
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce).to.be.true;
    expect(saveProjektiStub.getCall(0).firstArg).toMatchSnapshot();
  });

  it("should not allow kunnanEdustaja from being removed, when doing synchronizeUpdatesFromVelho, when kunnanEdustaja is Projektipäällikkö", async () => {
    mockLoadVelhoProjektiByOid();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    isAsianhallintaIntegrationEnabledStub.returns(Promise.resolve(false));
    isUspaIntegrationEnabledStub.returns(Promise.resolve(false));
    const projariKunnanEdustajana: DBProjekti = fixture.dbProjekti1();
    const projari = projariKunnanEdustajana.kayttoOikeudet.find((user) => user.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
    assertIsDefined(projari);
    projariKunnanEdustajana.suunnitteluSopimus = {
      yhteysHenkilo: projari.kayttajatunnus,
      kunta: 1,
      logo: {
        SUOMI: "logo.gif",
        RUOTSI: "logo.gif",
      },
    };
    loadProjektiByOid.reset();
    loadProjektiByOid.resolves(projariKunnanEdustajana);
    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce).to.be.true;
    expect(saveProjektiStub.getCall(0).firstArg.kayttoOikeudet.length).eql(6);
  });

  it("should not allow kunnanEdustaja from being removed, when doing synchronizeUpdatesFromVelho, when kunnan Edustaja is Varahenkilö", async () => {
    mockLoadVelhoProjektiByOid();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const varahenkiloKunnanEdustajana: DBProjekti = fixture.dbProjekti1();
    varahenkiloKunnanEdustajana.kayttoOikeudet[1].tyyppi = KayttajaTyyppi.VARAHENKILO; // tehdään Matti Meikäläisestä varahenkilö
    const varahenkilo = varahenkiloKunnanEdustajana.kayttoOikeudet[1];
    varahenkiloKunnanEdustajana.suunnitteluSopimus = {
      yhteysHenkilo: varahenkilo?.kayttajatunnus,
      kunta: 1,
      logo: {
        SUOMI: "logo.gif",
        RUOTSI: "logo.gif",
      },
    };
    loadProjektiByOid.reset();
    loadProjektiByOid.resolves(varahenkiloKunnanEdustajana);
    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce).to.be.true;
    expect(saveProjektiStub.getCall(0).firstArg.kayttoOikeudet.length).eql(5);
  });

  it("should make velho varahenkilö without A or L account muuHenkilo", async () => {
    // Mock velho returning otherwise same as before, but vastuuhenkilö is different and varahenkilo is not A or L account
    const updatedProjekti = fixture.dbProjekti1();
    const velhoData = updatedProjekti.velho;
    assertIsDefined(velhoData);
    velhoData.vastuuhenkilonEmail = a1User.email;
    velhoData.varahenkilonEmail = x1User.email;
    loadVelhoProjektiByOidStub.resolves(updatedProjekti);

    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await synchronizeUpdatesFromVelho("1");
    expect(saveProjektiStub.calledOnce).to.be.true;
    const expectedNewKayttoOikeudet = [
      {
        email: "Matti.Meikalainen@vayla.fi",
        kayttajatunnus: "A000111",
        etunimi: "Matti",
        sukunimi: "Meikalainen",
        puhelinnumero: "0293123123",
        organisaatio: "Väylävirasto",
        elyOrganisaatio: undefined,
        muokattavissa: true,
      },
      {
        email: "Kunta.Kuntalainen@vayla.fi",
        kayttajatunnus: "A000123",
        etunimi: "Kunta",
        sukunimi: "Kuntalainen",
        puhelinnumero: "029123123",
        organisaatio: "Nokia",
        elyOrganisaatio: undefined,
        muokattavissa: true,
      },
      {
        email: "eemil.elylainen@ely.fi",
        kayttajatunnus: "A000124",
        etunimi: "Eemil",
        sukunimi: "Elylainen",
        puhelinnumero: "123456789",
        organisaatio: "ELY",
        elyOrganisaatio: "PIRKANMAAN_ELY",
        muokattavissa: true,
      },
      {
        tyyppi: "PROJEKTIPAALLIKKO",
        email: "a1@vayla.fi",
        yleinenYhteystieto: true,
        muokattavissa: false,
        organisaatio: "Väylävirasto",
        etunimi: "EtunimiA1",
        sukunimi: "SukunimiA1",
        kayttajatunnus: "A1",
      },
      {
        tyyppi: null,
        muokattavissa: false,
        organisaatio: "Väylävirasto",
        email: "x1@vayla.fi",
        etunimi: "EtunimiX1",
        sukunimi: "SukunimiX1",
        kayttajatunnus: "X1",
      },
    ];
    expect(saveProjektiStub.getCall(0).firstArg.kayttoOikeudet).eql(expectedNewKayttoOikeudet);
  });
});
