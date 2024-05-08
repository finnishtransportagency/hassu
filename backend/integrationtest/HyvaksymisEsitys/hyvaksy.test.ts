import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
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
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";

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
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
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

  it("päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
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
      julkaistuHyvaksymisEsitys: { ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]), hyvaksyja: "theadminuid" },
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("onnistuu projektipäälliköltä ", async () => {
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
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.fulfilled;
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
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files).to.eql([
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
    ]);
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
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymiseistys on hyväksytty-tilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos muokattava hyväksymiseistys on muokkaustilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
    userFixture.loginAsAdmin();
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
