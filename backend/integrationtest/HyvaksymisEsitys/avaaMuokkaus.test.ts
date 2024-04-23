// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { expect } from "chai";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
// import { avaaHyvaksymisEsityksenMuokkaus } from "../../src/HyvaksymisEsitys/avaaMuokkaus";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";

// describe("Hyväksymisesityksen avaaHyvaksymisEsityksenMuokkaus", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("onnistuu projektikayttäjältä ja asettaa muokattavan hyväksymisesityksen muokkaustilaan", async () => {
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
//   //   // TODO: Stubbaa projektin tallentaminen
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   await avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   // TODO: testaa, että projekti tallennetaan oikeilla arvoilla
//   // });

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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu2 = avaaHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
//   //   await expect(kutsu2).to.eventually.be.rejectedWith(IllegalArgumentError);
//   // });
// });
