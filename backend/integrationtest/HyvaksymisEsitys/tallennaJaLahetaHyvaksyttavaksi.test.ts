import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2, TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertUploadFileToS3, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi } from "../../src/HyvaksymisEsitys/actions";
import { TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO } from "./TEST_HYVAKSYMISESITYS_INPUT";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { DBVaylaUser } from "../../src/database/model";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { adaptFileName, joinPath } from "../../src/tiedostot/paths";
import MockDate from "mockdate";

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
    MockDate.reset();
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
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.palautusSyy).is.undefined;
  });

  it("ei onnistu, jos tallennuksen yhteydessä annetaan uusi aineisto", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      suunnitelma: [
        {
          dokumenttiOid: "suunnitelmaDokumenttiOid2",
          nimi: "suunnitelma äöå 2.png",
          uuid: "suunnitelma-uuid2",
        },
      ],
    };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("onnistuu, vaikka tallennuksen yhteydessä annetaan uusi ladattu tiedosto", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const muistutusFileName = "muistutukset äöå 2.png";
    const uploadsUuid = "joku-uuid";
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      muistutukset: [
        {
          kunta: 1,
          tiedosto: joinPath(uploadsUuid, adaptFileName(muistutusFileName)),
          nimi: muistutusFileName,
          uuid: "muistutukset-esitys-uuid2",
        },
      ],
    };
    await insertUploadFileToS3(uploadsUuid, muistutusFileName);
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("muuttaa muokattavaa hyväksymisesitystä ennen hyväksyttäväksi lähettämistä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const muistutusFileName = "muistutukset äöå 2.png";
    const uploadsUuid = "joku-uuid";
    const muistutusUuid = "muistutukset-esitys-uuid2";
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      muistutukset: [
        {
          kunta: 2,
          tiedosto: joinPath(uploadsUuid, adaptFileName(muistutusFileName)),
          nimi: muistutusFileName,
          uuid: muistutusUuid,
        },
      ],
      poistumisPaiva: "2033-01-02",
      kiireellinen: false,
      lisatiedot: "Lisätietoja2",
      laskutustiedot: {
        ovtTunnus: "ovtTunnus2",
        verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus2",
        viitetieto: "viitetieto2",
      },
    };
    await insertUploadFileToS3(uploadsUuid, muistutusFileName);
    const date = "2022-02-01";
    MockDate.set(date);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.muistutukset).to.eql([
      { kunta: 2, nimi: muistutusFileName, uuid: muistutusUuid, lisatty: "2022-02-01T02:00:00+02:00" },
    ]);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.lisatiedot).to.eql("Lisätietoja2");
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.laskutustiedot).to.eql({
      ovtTunnus: "ovtTunnus2",
      verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus2",
      viitetieto: "viitetieto2",
    });
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
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
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
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      kayttoOikeudet: [projariAsVaylaDBUser],
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksyja: "theadminoid",
      hyvaksymisPaiva: "2022-01-02",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("onnistuu, vaikka yksi hyväksymisesitys olisi jo hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      hyvaksyja: "theadminoid",
      hyvaksymisPaiva: "2022-01-02",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos kaikki aineistot eivät ole valmiita", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      suunnitelma: [
        {
          dokumenttiOid: `suunnitelmaDokumenttiOid`,
          nimi: `suunnitelma äöå .png`,
          uuid: `suunnitelma-uuid`,
          lisatty: "2022-01-02T03:00:01+02:00", // myöhemmin kuin aineistoHandledAt
        },
      ],
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos tietoja puuttuu", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    delete muokattavaHyvaksymisEsitys.suunnitelma;
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid: "1",
      versio: 2,
      muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
    });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei ylikirjoita aineistoHandledAt-tietoa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.aineistoHandledAt).to.eql("2022-01-02T03:00:00+02:00");
  });
});
