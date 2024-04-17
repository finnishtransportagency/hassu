// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { expect } from "chai";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
// import { hyvaksyHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/hyvaksy";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
// import { projektiDatabase } from "../../src/database/projektiDatabase";
// import { fileService } from "../../src/files/fileService";
// import { PathTuple, ProjektiPaths } from "../../src/files/ProjektiPath";

// describe("Hyväksymisesityksen hyväksyminen", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("onnistuu projektipäälliköltä", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // TODO: stubbaa tiedostojen haku, poisto ja kopiointi
//   //   // TODO: stubbaa projektin tallentaminen
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta;
//   //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 });
//   //   await expect(kutsu).to.eventually.be.fulfilled;
//   //   // TODO: testaa, että projekti on tallennettu oikeilla tiedoilla
//   // });

//   // it("päivittää muokattavan hyväksymisesityksen tilan ja luo julkaistun hyväksymisesityksen muokattavan perusteella", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // TODO: stubbaa tiedostojen haku, poisto ja kopiointi
//   //   // TODO: stubbaa projektin tallentaminen
//   //   // TODO: stubbaa projektin tallentaminen
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta;
//   //   await hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 });
//   //   // TODO: testaa, että projekti on tallennettu oikeilla tiedoilla
//   // });

//   // it("poistaa vanhat julkaistut tiedostot ja kopioi muokkaustilaisen hyväksymisesityksen tiedostot julkaisulle", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // TODO: stubbaa tiedostojen haku, poisto ja kopiointi
//   //   // TODO: stubbaa projektin tallentaminen
//   //   // TODO: stubbaa projektin tallentaminen
//   //   // const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta;
//   //   await hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 });
//   //   // TODO: Testaa, että oikeat tiedostot poistetaan ja kopioidaan
//   // });

//   // it("ei onnistu projektihenkilöltä", async () => {
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
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
//   //   expect(kutsu).to.be.eventually.rejectedWith(IllegalAccessError);
//   // });

//   // it("ei onnistu, jos muokattava hyväksymiseistys on hyväksytty tai muokkaustilassa", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // Ei onnistu, jos muokattava hyväksymisesitys on hyväksytty
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
//   //   const julkaistuHyvaksymisEsitys = {
//   //     ...TEST_HYVAKSYMISESITYS,
//   //     hyvaksyHyvaksymisEsitysja: "oid",
//   //     hyvaksyHyvaksymisEsitysmisPaiva: "2002-01-01",
//   //   };
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
//   //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
//   //   // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
//   //   muokattavaHyvaksymisEsitys.tila == API.HyvaksymisTila.MUOKKAUS;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta, mutta nyt palauttaa eri arvon
//   //   const kutsu2 = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 });
//   //   expect(kutsu2).to.be.eventually.rejectedWith(IllegalArgumentError);
//   // });

//   // it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // const projektiInDB = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsity: undefined,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin hakeminen tietokannasta
//   //   const kutsu = hyvaksyHyvaksymisEsitys({ oid: "1", versio: 2 }, );
//   //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
//   // });
// });
