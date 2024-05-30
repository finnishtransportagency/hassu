import sinon from "sinon";
import { userService } from "../../src/user";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
import { haeHyvaksymisEsityksenTiedot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBProjekti, JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../src/database/model";

describe("HaeHyvaksymisRsityksenTiedot", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";

  afterEach(async () => {
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("antaa muokkauksenVoiAvata=true, kun hyväksymisesitys on hyväksytty ja hyväksymispäätösvaihetta ei vielä ole", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      salt: "salt",
      velho: {
        nimi: "Projektin nimi",
        asiatunnusVayla: "asiatunnus",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
      kayttoOikeudet: [],
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.true;
  });

  it("antaa muokkauksenVoiAvata=false, kun hyväksymisesitys on hyväksytty ja hyväksymispäätösvaihetta on olemassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe: { id: 1 },
      salt: "salt",
      velho: {
        nimi: "Projektin nimi",
        asiatunnusVayla: "asiatunnus",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
      kayttoOikeudet: [],
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.false;
  });
});
