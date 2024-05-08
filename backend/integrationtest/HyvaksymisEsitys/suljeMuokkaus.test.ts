import sinon from "sinon";
import { userService } from "../../src/user";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { setupLocalDatabase } from "../util/databaseUtil";
import {
  deleteYllapitoFiles,
  getProjektiFromDB,
  getYllapitoFilesUnderPath,
  insertProjektiToDB,
  insertYllapitoFileToS3,
  removeProjektiFromDB,
} from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { suljeHyvaksymisEsityksenMuokkaus } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBVaylaUser } from "../../src/database/model";
import omit from "lodash/omit";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";

describe("Hyväksymisesityksen suljeHyvaksymisEsityksenMuokkaus", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
  });

  beforeEach(async () => {
    // Aseta julkaistulle ja muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
  });

  afterEach(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("poistaa ja luo oikeat tiedostot", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, tila: API.HyvaksymisTila.MUOKKAUS };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    // Testaa että muokattavalle hyväksymisesitykselle on annettu samat tiedostot kuin julkaistulle ja että sen alkuperäiset tiedostot on poistettu
    expect(files.sort()).to.eql(
      [
        ...TEST_HYVAKSYMISESITYS_FILES.map(({ path }) => `yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/${path}`),
        ...TEST_HYVAKSYMISESITYS_FILES.map(({ path }) => `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/${path}`),
      ].sort()
    );
  });

  it("onnistuu projektikayttajalta", async () => {
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
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.to.be.fulfilled;
  });

  it("korvaa muokkaustilaisen hyväksymisesityksen julkaisun kopiolla", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, lisatiedot: "Muokattava", tila: API.HyvaksymisTila.MUOKKAUS };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      lisatiedot: "Julkaistu",
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const projektiAfter = await getProjektiFromDB(oid);
    // Testaa, että muokattava hyvksymisesitys on hyväksytty-tilassa ja että sen tiedot vastaavat julkaistua hyväksymisesitystä
    expect(omit(projektiAfter, "paivitetty")).to.eql({
      ...projektiBefore,
      versio: 3,
      muokattavaHyvaksymisEsitys: {
        ...omit(julkaistuHyvaksymisEsitys, ["hyvaksymisPaiva", "hyvaksyja"]),
        muokkaaja: "theadminuid",
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
  });

  it("ei onnistu ulkopuoliselta", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiInDB = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu jos hyväksymisesitys odottaa hyväksyntää", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiInDB = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu jos hyväksymisesitys on hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiInDB = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu jos ei ole julkaistua hyväksymisesitystä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const projektiInDB = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu jos ei ole muokkaustilaista eikä julkaistua hyväksymisesitystä", async () => {
    userFixture.loginAsAdmin();
    const projektiInDB = {
      oid,
      versio: 2,
    };
    await insertProjektiToDB(projektiInDB);
    const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
