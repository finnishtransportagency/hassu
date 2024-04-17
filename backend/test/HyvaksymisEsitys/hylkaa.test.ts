// import sinon from "sinon";
// import * as API from "hassu-common/graphql/apiModel";
// import { DBProjekti, DBVaylaUser } from "../../src/database/model";
// import { UserFixture } from "../fixture/userFixture";
// import { userService } from "../../src/user";
// import { expect } from "chai";
// import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
// import { palautaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/palauta";
// import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";

// describe("Hyväksymisesityksen hylkääminen", () => {
//   const userFixture = new UserFixture(userService);

//   afterEach(() => {
//     userFixture.logout();
//     sinon.reset();
//     sinon.restore();
//   });

//   // it("onnistuu projektipäälliköltä ja päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // TODO: stubbaa DynamoDB client
//   //   const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA };
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   await palautaHyvaksymisEsitys({ oid: "1", versio: 2, syy: "Virheitä" });
//   //   // TODO: testaa, että tietokantaan tallennetaan oikeita asioita
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
//   //   // const projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = palautaHyvaksymisEsitys({ oid: "1", versio: 2, syy: "Virheitä" });
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
//   //   const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, hyvaksyja: "oid", hyvaksymisPaiva: "2002-01-01" };
//   //   // let projektiInDB: DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = palautaHyvaksymisEsitys({ oid: "1", versio: 2, syy: "Virheitä" });
//   //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
//   //   // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
//   //   muokattavaHyvaksymisEsitys.tila == API.HyvaksymisTila.MUOKKAUS;
//   //   // projektiInDB = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsitys,
//   //   //   julkaistuHyvaksymisEsitys,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu2 = palautaHyvaksymisEsitys({ oid: "1", versio: 2, syy: "Virheitä" });
//   //   expect(kutsu2).to.be.eventually.rejectedWith(IllegalArgumentError);
//   // });

//   // it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
//   //   const projari = UserFixture.pekkaProjari;
//   //   const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
//   //     kayttajatunnus: projari.uid!,
//   //     tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
//   //   };
//   //   userFixture.loginAs(projari);
//   //   // const projektiInDB : DBProjekti = {
//   //   //   oid: "1",
//   //   //   versio: 2,
//   //   //   muokattavaHyvaksymisEsity: undefined,
//   //   //   julkaistuHyvaksymisEsitys: undefined,
//   //   //   kayttoOikeudet: [projariAsVaylaDBUser],
//   //   // } as DBProjekti;
//   //   // TODO: Mockaa projektin haku tietokannasta
//   //   const kutsu = palautaHyvaksymisEsitys({ oid: "1", versio: 2, syy: "Virheitä" });
//   //   expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError);
//   // });
// });
