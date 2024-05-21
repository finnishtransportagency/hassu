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
  const projariKayttajatunnus = "A123";
  const varahenkiloKayttajatunnus = "A000111";
  const projektiHenkiloKayttajatunnus = "A000112";

  const kayttoOikeudet = [
    {
      kayttajatunnus: projariKayttajatunnus,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      muokattavissa: false,
      etunimi: "Pekka",
      sukunimi: "Projari",
      email: "pekka.projari@vayla.fi",
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
    },
    {
      kayttajatunnus: varahenkiloKayttajatunnus,
      tyyppi: API.KayttajaTyyppi.VARAHENKILO,
      muokattavissa: true,
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      email: "Matti.Meikalainen@vayla.fi",
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
    },
    {
      kayttajatunnus: projektiHenkiloKayttajatunnus,
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

  it("antaa oikeat tiedot adminille", async () => {
    userFixture.loginAsAdmin();
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql({
      __typename: "KayttoOikeusTiedot",
      omaaMuokkausOikeuden: true,
      onProjektipaallikkoTaiVarahenkilo: true,
      onYllapitaja: true,
    });
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

  it("antaa oikeat tiedot tavalliselle ei-projektihenkilö-käyttäjälle", async () => {
    const muokkaaja = UserFixture.manuMuokkaaja;
    userFixture.loginAs(muokkaaja);
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql({
      __typename: "KayttoOikeusTiedot",
      omaaMuokkausOikeuden: false,
      onProjektipaallikkoTaiVarahenkilo: false,
      onYllapitaja: false,
    });
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

  it("antaa oikeat tiedot projektipäällikkölle", async () => {
    const projariAsProjektiKayttaja = { kayttajatunnus: projariKayttajatunnus };
    userFixture.loginAsProjektiKayttaja(projariAsProjektiKayttaja);
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql({
      __typename: "KayttoOikeusTiedot",
      omaaMuokkausOikeuden: true,
      onProjektipaallikkoTaiVarahenkilo: true,
      onYllapitaja: false,
    });
  });

  it("antaa oikeat tiedot varahenkilölle", async () => {
    const varahenkiloAsProjektikayttaja = { kayttajatunnus: varahenkiloKayttajatunnus };
    userFixture.loginAsProjektiKayttaja(varahenkiloAsProjektikayttaja);
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql({
      __typename: "KayttoOikeusTiedot",
      omaaMuokkausOikeuden: true,
      onProjektipaallikkoTaiVarahenkilo: true,
      onYllapitaja: false,
    });
  });

  it("antaa oikeat tiedot projektihenkilölle", async () => {
    const prokjektihloAsProjektikayttaja = { kayttajatunnus: projektiHenkiloKayttajatunnus };
    userFixture.loginAsProjektiKayttaja(prokjektihloAsProjektikayttaja);
    const projektiBefore = {
      oid,
      versio,
      kayttoOikeudet,
    };
    await insertProjektiToDB(projektiBefore);
    const fetchedKayttoOikeudet = await haeKayttoOikeudet(oid);
    expect(fetchedKayttoOikeudet).to.eql({
      __typename: "KayttoOikeusTiedot",
      omaaMuokkausOikeuden: true,
      onProjektipaallikkoTaiVarahenkilo: false,
      onYllapitaja: false,
    });
  });
});
