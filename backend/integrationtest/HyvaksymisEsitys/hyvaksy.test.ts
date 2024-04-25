import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILE_PATHS,
  TEST_HYVAKSYMISESITYS_FILE_PATHS2,
} from "./TEST_HYVAKSYMISESITYS";
import {
  deleteYllapitoFiles,
  getProjektiFromDB,
  getYllapitoFilesUnderPath,
  insertProjektiToDB,
  insertYllapitoFileToS3,
  removeProjektiFromDB,
} from "./util";
import { hyvaksyHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { omit } from "lodash";
import { expect } from "chai";
import { UserFixture } from "../../test/fixture/userFixture";
import { setupLocalDatabase } from "../util/databaseUtil";

describe("Hyväksymisesityksen hyväksyminen", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
  });

  beforeEach(async () => {
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILE_PATHS.map(async (file) => {
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

  it("onnistuu projektipäälliköltä ja päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect({
      ...omit(projektiAfter, "paivitetty"),
      julkaistuHyvaksymisEsitys: omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva"),
    }).to.eql({
      ...projektiBefore,
      versio: versio + 1,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.HYVAKSYTTY, palautusSyy: null },
      julkaistuHyvaksymisEsitys: { ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]), hyvaksyja: projari.uid },
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("luo julkaistun hyväksymisesityksen muokattavan perusteella", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva")).to.eql({
      ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]),
      hyvaksyja: projari.uid,
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("poistaa vanhat julkaistut tiedostot ja kopioi muokkaustilaisen hyväksymisesityksen tiedostot julkaisulle", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, hyvaksyja: projari.uid, hyvaksymisPaiva: "2022-01-01" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILE_PATHS2.map(async (file) => {
        const path = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${file}`;
        await insertYllapitoFileToS3(path);
      })
    );
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files).to.eql([
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
    ]);
  });

  // it("ei onnistu projektihenkilöltä", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: muokkaaja.uid!,
  //   };
  //   userFixture.loginAs(muokkaaja);
  //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
  //   // const projektiInDB : DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys,
  //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   // } as DBProjekti;
  //   // TODO: Mockaa projektin hakeminen tietokannasta
  //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
  //   expect(kutsu).to.be.eventually.rejectedWith(IllegalAccessError);
  // });

  // it("ei onnistu, jos muokattava hyväksymiseistys on hyväksytty tai muokkaustilassa", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
  //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
  //   const julkaistuHyvaksymisEsitys = {
  //     ...TEST_HYVAKSYMISESITYS,
  //     hyvaksyHyvaksymisEsitysja: "oid",
  //     hyvaksyHyvaksymisEsitysmisPaiva: "2002-01-01",
  //   };
  //   // const projektiInDB: DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys,
  //   //   julkaistuHyvaksymisEsitys,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti
  //   // TODO: Mockaa projektin hakeminen tietokannasta
  //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
  //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
  //   // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
  //   muokattavaHyvaksymisEsitys.tila == API.HyvaksymisTila.MUOKKAUS;
  //   // TODO: Mockaa projektin hakeminen tietokannasta, mutta nyt palauttaa eri arvon
  //   const kutsu2 = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 });
  //   expect(kutsu2).to.be.eventually.rejectedWith(IllegalArgumentError);
  // });

  // it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   // const projektiInDB = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsity: undefined,
  //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   // TODO: Mockaa projektin hakeminen tietokannasta
  //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
  //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
  // });
});
