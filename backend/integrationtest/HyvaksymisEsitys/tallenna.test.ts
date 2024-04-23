// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { expect } from "chai";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
// import { tallennaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/tallenna";
// import TEST_HYVAKSYMISESITYS_INPUT from "./TEST_HYVAKSYMISESITYS_INPUT";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";

// describe("Hyväksymisesityksen tallentaminen", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("päivittää muokattavan hyväksymisesityksen", async () => {
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
//   //   // TODO: stubbaa projektin tallennus
//   //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
//   //     ...TEST_HYVAKSYMISESITYS_INPUT,
//   //   };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
//   //   //   julkaistuHyvaksymisEsitys: {},
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   await tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys }, );
//   //   // TODO: testaa, että projekti tallennetaan oikeilla arvoilla
//   // });

//   // it("onnistuu projektihenkilöltä", async () => {
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
//   //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
//   //     ...TEST_HYVAKSYMISESITYS_INPUT,
//   //   };
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
//   //   //   julkaistuHyvaksymisEsitys: {},
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys }, );
//   //   await expect(kutsu).to.eventually.to.be.fulfilled;
//   // });

//   // it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   const muokkaaja = UserFixture.manuMuokkaaja;
//   //   userFixture.loginAs(muokkaaja);
//   //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
//   //     ...TEST_HYVAKSYMISESITYS_INPUT,
//   //   };
//   //   // const projektiInDB : DBProjekti =  {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
//   //   //   julkaistuHyvaksymisEsitys: {},
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys },);
//   //   await expect(kutsu).to.eventually.to.be.rejectedWith(IllegalAccessError);
//   // });

//   // it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty tai odottaa hyväksyntää", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
//   //     ...TEST_HYVAKSYMISESITYS_INPUT,
//   //   };
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
//   //   // let projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
//   //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput }, );
//   //   await expect(kutsu).to.eventually.to.be.rejectedWith(IllegalArgumentError);
//   //   // Ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää

//   //   muokattavaHyvaksymisEsitys.tila = API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA;
//   //   // projektiInDB = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti
//   //   // TODO: Päivitä, mitä mockattu projektihaku palauttaa
//   //   const kutsu2 = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput }, );
//   //   await expect(kutsu2).to.eventually.to.be.rejectedWith(IllegalArgumentError);
//   // });

//   // it("onnistuu, jos ei ole muokattavaa eikä julkaistua hyväksymisesitystä", async () => {
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
//   //   // TODO: Mockaa projektin tallennus
//   //   const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
//   //     ...TEST_HYVAKSYMISESITYS_INPUT,
//   //   };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: undefined,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = tallennaHyvaksymisEsitys({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys });
//   //   await expect(kutsu).to.eventually.to.be.fulfilled;
//   // });

//   // TODO: "laukaisee oikeanlaisia tapahtumia, jos on uusia tiedostoja tai aineistoja"
// });
