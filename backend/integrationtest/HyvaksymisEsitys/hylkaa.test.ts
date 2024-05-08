import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB } from "./util";
import { palautaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { omit } from "lodash";
import { setupLocalDatabase } from "../util/databaseUtil";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";

describe("Hyväksymisesityksen hylkääminen", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";
  const versio = 2;

  afterEach(async () => {
    userFixture.logout();
    await removeProjektiFromDB(oid);
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
    };
    const syy = "Virheitä";
    await insertProjektiToDB(projektiBefore);
    await palautaHyvaksymisEsitys({ oid, versio, syy });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(omit(projektiAfter, "paivitetty")).to.eql({
      ...projektiBefore,
      versio: versio + 1,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.MUOKKAUS, palautusSyy: syy },
    });
    expect(projektiAfter.paivitetty).to.exist;
    await removeProjektiFromDB(oid);
  });

  it("onnistuu projektipäälliköltä", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = palautaHyvaksymisEsitys({ oid, versio, syy: "Virheitä" });
    expect(kutsu).to.be.eventually.fulfilled;
    await removeProjektiFromDB(oid);
  });

  it("ei onnistu projektihenkilöltä", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: muokkaaja.uid!,
    };
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = palautaHyvaksymisEsitys({ oid, versio, syy: "Virheitä" });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalAccessError);
    await removeProjektiFromDB(oid);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty", async () => {
    userFixture.loginAsAdmin();
    // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksyja: "oid", hyvaksymisPaiva: "2002-01-01" };
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = palautaHyvaksymisEsitys({ oid, versio, syy: "Virheitä" });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
    await removeProjektiFromDB(oid);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa", async () => {
    userFixture.loginAsAdmin();
    // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksyja: "oid", hyvaksymisPaiva: "2002-01-01" };
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = palautaHyvaksymisEsitys({ oid, versio, syy: "Virheitä" });
    expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
    await removeProjektiFromDB(oid);
  });

  it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
    userFixture.loginAsAdmin();
    const projektiInDB = {
      oid,
      versio,
      muokattavaHyvaksymisEsity: undefined,
      julkaistuHyvaksymisEsitys: undefined,
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = palautaHyvaksymisEsitys({ oid, versio, syy: "Virheitä" });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
  });
});
