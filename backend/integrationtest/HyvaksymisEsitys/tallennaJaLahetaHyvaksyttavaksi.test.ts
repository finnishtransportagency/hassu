import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, getProjektiFromDB, insertProjektiToDB, insertYllapitoFileToS3, removeProjektiFromDB } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { setupLocalDatabase } from "../util/databaseUtil";
import { tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi } from "../../src/HyvaksymisEsitys/actions";
import TEST_HYVAKSYMISESITYS_INPUT from "./TEST_HYVAKSYMISESITYS_INPUT";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { DBVaylaUser } from "../../src/database/model";
import { IllegalAccessError } from "hassu-common/error";

describe("Hyväksymisesityksen tallentaminen ja hyväksyttäväksi lähettäminen", () => {
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

  it("päivittää muokattavan hyväksymisesityksen tilan ja poistaa palautusSyyn", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.palautusSyy).is.undefined;
  });

  it("onnistuu projektihenkilöltä", async () => {
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
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  //   // it("ei onnistu, jos muokattava hyväksymiseistys on hyväksytty tai odottaa hyväksyntää", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   //   const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: muokkaaja.uid!,
  //   //   };
  //   //   userFixture.loginAs(muokkaaja);
  //   //   // ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
  //   //   let muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, palautusSyy: "virheitä", tila: API.HyvaksymisTila.HYVAKSYTTY };
  //   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksyja: "oid", hyvaksymisPaiva: "2002-01-01" };
  //   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
  //   //   // let projektiInDB = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
  //   //     oid: "1",
  //   //     versio: 2,
  //   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
  //   //   });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   //   // ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää
  //   //   muokattavaHyvaksymisEsitys = { ...muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
  //   //   // projektiInDB = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu2 = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
  //   //     oid: "1",
  //   //     versio: 2,
  //   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
  //   //   });
  //   //   await expect(kutsu2).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });

  //   // it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   //   const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: muokkaaja.uid!,
  //   //   };
  //   //   userFixture.loginAs(muokkaaja);
  //   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
  //   //   // const projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys: undefined,
  //   //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
  //   //     oid: "1",
  //   //     versio: 2,
  //   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
  //   //   });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });

  //   // it("ei onnistu, jos kaikki tiedostot eivät ole valmiita", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   //   const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: muokkaaja.uid!,
  //   //   };
  //   //   userFixture.loginAs(muokkaaja);
  //   //   const muokattavaHyvaksymisEsitys = {
  //   //     ...TEST_HYVAKSYMISESITYS,
  //   //     tila: API.HyvaksymisTila.MUOKKAUS,
  //   //   };
  //   //   muokattavaHyvaksymisEsitys.suunnitelma = [
  //   //     {
  //   //       dokumenttiOid: "suunnitelmaDokumenttiOid",
  //   //       tiedosto: undefined,
  //   //       nimi: "suunnitelma.png",
  //   //       uuid: "suunnitelma-uuid",
  //   //       tuotu: undefined,
  //   //       tila: API.AineistoTila.ODOTTAA_TUONTIA,
  //   //     },
  //   //   ];
  //   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
  //   //   // const projektiInDB: DBProjekti = {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
  //   //     oid: "1",
  //   //     versio: 2,
  //   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
  //   //   });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });

  //   // it("ei onnistu, jos tietoja puuttuu", async () => {
  //   //   const projari = UserFixture.pekkaProjari;
  //   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: projari.uid!,
  //   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  //   //   };
  //   //   const muokkaaja = UserFixture.manuMuokkaaja;
  //   //   const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
  //   //     kayttajatunnus: muokkaaja.uid!,
  //   //   };
  //   //   userFixture.loginAs(muokkaaja);
  //   //   const muokattavaHyvaksymisEsitys = {
  //   //     ...TEST_HYVAKSYMISESITYS,
  //   //     tila: API.HyvaksymisTila.MUOKKAUS,
  //   //   };
  //   //   delete muokattavaHyvaksymisEsitys.suunnitelma;
  //   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
  //   //   // const projektiInDB : DBProjekti =       {
  //   //   //   oid: "1",
  //   //   //   versio: 2,
  //   //   //   muokattavaHyvaksymisEsitys,
  //   //   //   julkaistuHyvaksymisEsitys: undefined,
  //   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  //   //   // } as DBProjekti;
  //   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
  //   //     oid: "1",
  //   //     versio: 2,
  //   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
  //   //   });
  //   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  //   // });
});
