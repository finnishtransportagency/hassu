// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { expect } from "chai";
// import { tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi } from "../../src/HyvaksymisEsitys/tallennaJaLahetaHyvaksyttavaksi";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
// import TEST_HYVAKSYMISESITYS_INPUT from "./TEST_HYVAKSYMISESITYS_INPUT";

// describe("Hyväksymisesityksen hyväksyttäväksi lähettäminen", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("onnistuu projektihenkilöltä ja päivittää muokattavan hyväksymisesityksen tilan ja poistaa palautusSyyn", async () => {
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
//   //   // TODO: Stubbaa projektin tallennsu
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, palautusSyy: "virheitä", tila: API.HyvaksymisTila.MUOKKAUS };
//   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput },);
//   //   // TODO: testaa, että projekti tallennetaan oikeilla arvoilla
//   // });

//   // it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   const muokkaaja = UserFixture.manuMuokkaaja;
//   //   userFixture.loginAs(muokkaaja);
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, palautusSyy: "virheitä", tila: API.HyvaksymisTila.MUOKKAUS };
//   //   const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser], // muokkaaja ei ole projektihenkilöissä
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput }, );
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
//   // });

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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
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
//   //   // TODO: Projektin tietokantahaku-mock palauttaa nyt ylläolevan
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta;
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta;
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
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
//   //     oid: "1",
//   //     versio: 2,
//   //     muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
//   //   });
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
//   // });
// });
