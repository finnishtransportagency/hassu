import sinon from "sinon";
import { userService } from "../../src/user";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2, TEST_HYVAKSYMISESITYS_FILE_PATHS } from "./TEST_HYVAKSYMISESITYS";
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
import { avaaHyvaksymisEsityksenMuokkaus } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBVaylaUser } from "../../src/database/model";
import omit from "lodash/omit";

describe("Hyväksymisesityksen avaaHyvaksymisEsityksenMuokkaus", () => {
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
      TEST_HYVAKSYMISESITYS_FILE_PATHS.map(async (file: string) => {
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

  it("asettaa muokattavan hyväksymisesityksen muokkaustilaan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const projektiAfter = await getProjektiFromDB(oid);
    // Testaa, että muokattava hyvksymisesitys on hyväksytty-tilassa ja että sen tiedot vastaavat julkaistua hyväksymisesitystä
    expect(omit(projektiAfter, "paivitetty")).to.eql({
      ...projektiBefore,
      versio: 3,
      muokattavaHyvaksymisEsitys: {
        ...muokattavaHyvaksymisEsitys,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
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
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.to.be.fulfilled;
  });

  it("ei muokkaa tiedostoja", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
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
    const filesBefore = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    await avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const filesAfter = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    // Testaa että tiedostot ovat yhä samat
    expect(filesBefore.sort()).to.eql(filesAfter.sort());
  });

  //   // it("ei onnistu ulkopuoliselta", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   //   userFixture.loginAs(muokkaaja);
  //   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
  //   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
  //   //   // const projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  //   // });

  //   // it("ei onnistu, jos ei ole julkaistua hyväksymisesitystä", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   userFixture.loginAs(projari);
  //   //   // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
  //   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
  //   //   // let projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti
  //   //   const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   //   // Ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää
  //   //   muokattavaHyvaksymisEsitys.tila == API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  //   //   // projektiInDB = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu2 = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
  //   //   await expect(kutsu2).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });

  //   // it("ei onnistu, jos on jo muokkaustilainen hyväksymisesitys", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   userFixture.loginAs(projari);
  //   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
  //   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
  //   //   // const projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });

  //   // it("ei onnistu, jos on hyväksymistä odottava tai muokkaustilainen hyväksymisesitys julkaistun lisäksi", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   userFixture.loginAs(projari);
  //   //   // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
  //   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
  //   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
  //   //   // let projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   //   // Ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää
  //   //   muokattavaHyvaksymisEsitys.tila == API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  //   //   // projektiInDB = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu2 = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
  //   //   await expect(kutsu2).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });
});
