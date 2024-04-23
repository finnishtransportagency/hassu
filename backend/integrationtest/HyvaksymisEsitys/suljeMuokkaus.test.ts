// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { suljeHyvaksymisEsityksenMuokkaus } from "../../src/HyvaksymisEsitys/suljeMuokkaus";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { fileService } from "../../src/files/fileService";
// import { expect } from "chai";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
// import { projektiDatabase } from "../../src/database/projektiDatabase";
// import { PathTuple, ProjektiPaths } from "../../src/files/ProjektiPath";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";

// describe("Hyväksymisesityksen suljeHyvaksymisEsityksenMuokkaus", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("poistaa ja luo oikeat tiedostot", async () => {
//   //   userFixture.loginAsAdmin();
//   //   // TODO: Stubbaa tiedostojen haku, poisto ja tallennus
//   //   // TODO: Stubbaa projektin tallennus
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   await suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   // TODO: testaa, että oikeat tiedostot poistetaan ja tallennetaan
//   // });

//   // it("onnistuu projektikayttajalta", async () => {
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
//   //   // Stubbaa tiedostojen haku, poisto ja tallennus
//   //   // Stubbaa projektin tallennus
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   await expect(kutsu).to.eventually.to.be.fulfilled;
//   // });

//   // it("ei onnistu ulkopuoliselta", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   const muokkaaja = UserFixture.manuMuokkaaja;
//   //   userFixture.loginAs(muokkaaja);
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksymisPaiva: "2022-01-01", hyvaksyja: "oid" };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
//   // });

//   // it("korvaa muokkaustilaisen hyväksymisesityksen julkaisun kopiolla", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // TODO: stubbaa tiedostojen poisto ja kopiointi
//   //   // TODO: Stubbaa projetin tallennus
//   //   // const projetkiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { poistumisPaiva: "2002-01-11", tila: API.HyvaksymisTila.MUOKKAUS },
//   //   //   julkaistuHyvaksymisEsitys: { poistumisPaiva: "2002-01-01", hyvaksyja: "oid", hyvaksymisPaiva: "2011-03-03" },
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   await suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   // TODO: testaa, että tietokantaan tallennetaan oikea asia
//   // });

//   // it("ei onnistu, jos ei ole muokkaustilaista hyväksymisesitystä", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { poistumisPaiva: "2002-01-11", tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA },
//   //   //   julkaistuHyvaksymisEsitys: { poistumisPaiva: "2002-01-01", hyvaksyja: "oid", hyvaksymisPaiva: "2011-03-03" },
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 }, );
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
//   // });

//   // it("ei onnistu, jos on muokkaustilainen hyväksymisesitys, mutta ei ole julkaistua hyväksymisesitystä", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // const projektiInDB : DBProjekti =  {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: { poistumisPaiva: "2002-01-11", tila: API.HyvaksymisTila.MUOKKAUS },
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 },);
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
//   // });

//   // it("ei onnistu, jos ei ole muokkaustilaista eikä julkaistua hyväksymisesitystä", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys: undefined,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = suljeHyvaksymisEsityksenMuokkaus({ oid: "1", versio: 2 });
//   //   await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
//   // });
// });
