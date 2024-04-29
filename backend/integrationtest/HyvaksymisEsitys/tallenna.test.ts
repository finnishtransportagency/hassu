import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS_INPUT, { INPUTIN_LADATUT_TIEDOSTOT } from "./TEST_HYVAKSYMISESITYS_INPUT";
import { tallennaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { UserFixture } from "../../test/fixture/userFixture";
import {
  deleteYllapitoFiles,
  emptyUploadFiles,
  getProjektiFromDB,
  getYllapitoFilesUnderPath,
  insertProjektiToDB,
  insertUploadFileToS3,
  removeProjektiFromDB,
} from "./util";
import { expect } from "chai";
import { setupLocalDatabase } from "../util/databaseUtil";
import { omit } from "lodash";
import MockDate from "mockdate";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";

describe("Hyväksymisesityksen tallentaminen", () => {
  const userFixture = new UserFixture(userService);
  const oid = "Testi1";
  const date = "2022-01-02"; // Sama aika kuin testidatassa
  setupLocalDatabase();

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
    await emptyUploadFiles();
    MockDate.set(date);
  });

  afterEach(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    await emptyUploadFiles();
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
    MockDate.reset();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("onnistuu projektikäyttäjältä ja tallentaa annetut tiedot tietokantaan", async () => {
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

    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    const projektiAfter = await getProjektiFromDB(oid);
    const expectedMuokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS };
    expect(projektiAfter.muokattavaHyvaksymisEsitys).to.eql({
      ...omit(expectedMuokattavaHyvaksymisEsitys, ["muokkaaja", "vastanottajat"]),
      muokkaaja: muokkaaja.uid,
      tila: API.HyvaksymisTila.MUOKKAUS,
      vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
    });
    expect(projektiAfter.paivitetty).to.eql("2022-01-02T02:00:00+02:00");
  });

  it("persistoi inputissa annetut ladatut tiedostot", async () => {
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

    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files.sort()).to.eql(
      INPUTIN_LADATUT_TIEDOSTOT.map(
        ({ filename, uuid: avain }) => `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/${avain}/${filename}`
      ).sort()
    );
  });

  // it("onnistuu projektihenkilöltä", async () => {
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
  //   // TODO: Stubbaa projektin tallentaminen
  //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
  //     ...TEST_HYVAKSYMISESITYS_INPUT,
  //   };
  //   // const projektiInDB: DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
  //   //   julkaistuHyvaksymisEsitys: {},
  //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys }, );
  //   await expect(kutsu).to.eventually.to.be.fulfilled;
  // });

  // it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   userFixture.loginAs(muokkaaja);
  //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
  //     ...TEST_HYVAKSYMISESITYS_INPUT,
  //   };
  //   // const projektiInDB : DBProjekti =  {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
  //   //   julkaistuHyvaksymisEsitys: {},
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys },);
  //   await expect(kutsu).to.eventually.to.be.rejectedWith(IllegalAccessError);
  // });

  // it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty tai odottaa hyväksyntää", async () => {
  //   const projari = UserFixture.pekkaProjari;
  //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //     kayttajatunnus: projari.uid!,
  //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   };
  //   userFixture.loginAs(projari);
  //   const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
  //     ...TEST_HYVAKSYMISESITYS_INPUT,
  //   };
  //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
  //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
  //   // let projektiInDB : DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys,
  //   //   julkaistuHyvaksymisEsitys,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti
  //   // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
  //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput }, );
  //   await expect(kutsu).to.eventually.to.be.rejectedWith(IllegalArgumentError);
  //   // Ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää

  //   muokattavaHyvaksymisEsitys.tila = API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
  //   // projektiInDB = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys,
  //   //   julkaistuHyvaksymisEsitys,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser],
  //   // } as DBProjekti
  //   const kutsu2 = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput }, );
  //   await expect(kutsu2).to.eventually.to.be.rejectedWith(IllegalArgumentError);
  // });

  // it("onnistuu, jos ei ole muokattavaa eikä julkaistua hyväksymisesitystä", async () => {
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
  //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
  //     ...TEST_HYVAKSYMISESITYS_INPUT,
  //   };
  //   // const projektiInDB : DBProjekti = {
  //   //   oid: "1",
  //   //   versio: 2,
  //   //   muokattavaHyvaksymisEsitys: undefined,
  //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   // } as DBProjekti;
  //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys });
  //   await expect(kutsu).to.eventually.to.be.fulfilled;
  // });

  // TODO: "laukaisee oikeanlaisia tapahtumia, jos on uusia tiedostoja tai aineistoja"
});
