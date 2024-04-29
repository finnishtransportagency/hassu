import sinon from "sinon";
import { userService } from "../../src/user";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILE_PATHS,
  TEST_HYVAKSYMISESITYS_FILE_PATHS2,
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
      TEST_HYVAKSYMISESITYS_FILE_PATHS.map(async (file: string) => {
        const path = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${file}`;
        await insertYllapitoFileToS3(path);
      })
    );
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILE_PATHS2.map(async (file: string) => {
        const path = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${file}`;
        await insertYllapitoFileToS3(path);
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
        ...TEST_HYVAKSYMISESITYS_FILE_PATHS.map((file: string) => `yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/${file}`),
        ...TEST_HYVAKSYMISESITYS_FILE_PATHS.map((file: string) => `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/${file}`),
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
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
  });

  // it("ei onnistu ulkopuoliselta", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   userFixture.loginAs(muokkaaja);
  //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
  //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
  //   // const projektiInDB : DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys,
  //   //   julkaistuHyvaksymisEsitys,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
  //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  // });

  // it("ei onnistu, jos ei ole muokkaustilaista hyväksymisesitystä", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   // const projektiInDB : DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: { poistumisPaiva: "2002-01-11", tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA },
  //   //   julkaistuHyvaksymisEsitys: { poistumisPaiva: "2002-01-01", hyvaksyja: "oid", hyvaksymisPaiva: "2011-03-03" },
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
  //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  // });

  // it("ei onnistu, jos on muokkaustilainen hyväksymisesitys, mutta ei ole julkaistua hyväksymisesitystä", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   // const projektiInDB : DBProjekti =  {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: { poistumisPaiva: "2002-01-11", tila: API.HyvaksymisTila.MUOKKAUS },
  //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 },);
  //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  // });

  // it("ei onnistu, jos ei ole muokkaustilaista eikä julkaistua hyväksymisesitystä", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   // const projektiInDB: DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: undefined,
  //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
  //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  // });
});
