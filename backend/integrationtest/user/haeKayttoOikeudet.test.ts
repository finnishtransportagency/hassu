import sinon from "sinon";
import { userService } from "../../src/user";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import haeKayttoOikeudet from "../../src/user/haeKayttoOikeudet";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { NoVaylaAuthenticationError } from "hassu-common/error";

describe("HaeKayttoOikeudet", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";
  const versio = 2;

  const kayttoOikeudet = [
    {
      kayttajatunnus: "A123",
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      muokattavissa: false,
      etunimi: "Pekka",
      sukunimi: "Projari",
      email: "pekka.projari@vayla.fi",
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
    },
    {
      kayttajatunnus: "A000111",
      tyyppi: API.KayttajaTyyppi.VARAHENKILO,
      muokattavissa: true,
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      email: "Matti.Meikalainen@vayla.fi",
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
    },
    {
      kayttajatunnus: "A000112",
      muokattavissa: true,
      etunimi: "A-tunnus1",
      sukunimi: "Hassu",
      email: "mikko.haapamki@cgi.com",
      organisaatio: "CGI Suomi Oy",
      puhelinnumero: "123456789",
    },
  ];

  afterEach(async () => {
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn", async () => {
    userFixture.loginAsAdmin();
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql([
      {
        __typename: "ProjektiKayttaja",
        kayttajatunnus: "A123",
        organisaatio: "Väylävirasto",
        tyyppi: "PROJEKTIPAALLIKKO",
        etunimi: "Pekka",
        sukunimi: "Projari",
        puhelinnumero: "123456789",
        email: "pekka.projari@vayla.fi",
        muokattavissa: false,
      },
      {
        __typename: "ProjektiKayttaja",
        kayttajatunnus: "A000111",
        organisaatio: "Väylävirasto",
        tyyppi: "VARAHENKILO",
        etunimi: "Matti",
        sukunimi: "Meikalainen",
        puhelinnumero: "123456789",
        email: "Matti.Meikalainen@vayla.fi",
        muokattavissa: true,
      },
      {
        __typename: "ProjektiKayttaja",
        kayttajatunnus: "A000112",
        organisaatio: "CGI Suomi Oy",
        etunimi: "A-tunnus1",
        sukunimi: "Hassu",
        puhelinnumero: "123456789",
        email: "mikko.haapamki@cgi.com",
        muokattavissa: true,
      },
    ]);
  });

  it("ei onnistu kirjautumatta", async () => {
    userFixture.logout();
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = haeKayttoOikeudet(oid);
    await expect(kutsu).to.be.eventually.rejectedWith(NoVaylaAuthenticationError);
  });

  it("onnistuu tavalliselta käyttäjältä", async () => {
    const muokkaaja = UserFixture.manuMuokkaaja;
    userFixture.loginAs(muokkaaja);
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = haeKayttoOikeudet(oid);
    await expect(kutsu).to.be.eventually.fulfilled;
  });

  it("ei mene sekaisin tyhjästä kayttöoikeuslistasta", async () => {
    userFixture.loginAsAdmin();
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet: [],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = haeKayttoOikeudet(oid);
    await expect(kutsu).to.be.eventually.fulfilled;
  });
});
