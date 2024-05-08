import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS_INPUT, {
  INPUTIN_LADATUT_TIEDOSTOT,
  TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
} from "./TEST_HYVAKSYMISESITYS_INPUT";
import { tallennaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { UserFixture } from "../../test/fixture/userFixture";
import {
  deleteYllapitoFiles,
  emptyUploadFiles,
  getProjektiFromDB,
  getYllapitoFilesUnderPath,
  insertProjektiToDB,
  insertUploadFileToS3,
  insertYllapitoFileToS3,
  removeProjektiFromDB,
} from "./util";
import { expect } from "chai";
import { setupLocalDatabase } from "../util/databaseUtil";
import { omit } from "lodash";
import MockDate from "mockdate";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { adaptFileName } from "../../src/tiedostot/paths";

describe("Hyväksymisesityksen tallentaminen", () => {
  const userFixture = new UserFixture(userService);
  const oid = "Testi1";
  const date = "2022-01-02"; // Sama aika kuin testidatassa
  setupLocalDatabase();

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
    await emptyUploadFiles();
  });

  beforeEach(() => {
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

  it("tallentaa annetut tiedot tietokantaan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    const expectedMuokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS };
    expect(projektiAfter.muokattavaHyvaksymisEsitys).to.eql({
      ...omit(expectedMuokattavaHyvaksymisEsitys, ["muokkaaja", "vastanottajat"]),
      muokkaaja: "theadminuid",
      tila: API.HyvaksymisTila.MUOKKAUS,
      vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
    });
    expect(projektiAfter.paivitetty).to.eql("2022-01-02T02:00:00+02:00");
  });

  it("poistaa tiedostot, jotka tiputettiin muokattavasta hyväksymisesityksestä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files.sort()).to.eql(
      INPUTIN_LADATUT_TIEDOSTOT.map(
        ({ filename, uuid: avain }) => `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/${avain}/${filename}`
      ).sort()
    );
  });

  it("osaa pitää, lisätä ja poistaa tiedostoja samaan aikaan", async () => {
    userFixture.loginAsAdmin();
    // Luodaan DB:ssä olevan hyväksymisesityksen data
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
          nimi: "muuAineistoVelhosta äöå .png",
          uuid: "muuAineistoVelhosta-uuid",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
        // Poistetaan alla oleva tiedosto myöhemmin
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid2",
          nimi: "muuAineistoVelhosta äöå 2.png",
          uuid: "muuAineistoVelhosta-uuid2",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
      ],
      muuAineistoKoneelta: [
        {
          nimi: "muuAineistoKoneelta äöå .png",
          uuid: "muuAineistoKoneelta-esitys-uuid",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
        // Poistetaan alla oleva tiedosto myöhemmin
        {
          nimi: "muuAineistoKoneelta äöå 2.png",
          uuid: "muuAineistoKoneelta-esitys-uuid2",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
      ],
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
    };
    // Asetetaan DB:ssä olevan projektin data
    await insertProjektiToDB(projektiBefore);
    // Luodaan DB:ssä olevassa projektissa viitatut tiedostot
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    const fullpathMuuVelho2 = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/muuAineistoVelhosta/${adaptFileName(
      "muuAineistoVelhosta äöå 2.png"
    )}`;
    await insertYllapitoFileToS3(fullpathMuuVelho2);
    const fullpathMuuKoneelta2 = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/muuAineistoKoneelta/${adaptFileName(
      "muuAineistoKoneelta äöå 2.png"
    )}`;
    await insertYllapitoFileToS3(fullpathMuuKoneelta2);

    // Luodaan inputissa viitatut tiedostot uploads-kansioon
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    await insertUploadFileToS3("upload-uuid", "tiedostonimi.png");
    // Luodaan inputin data
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
          nimi: "muuAineistoVelhosta äöå .png",
          uuid: "muuAineistoVelhosta-uuid", // Sama kuin ennen
        },
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid3",
          nimi: "muuAineistoVelhosta äöå 3.png",
          uuid: "muuAineistoVelhosta-uuid3", // Uusi
        },
      ],
      muuAineistoKoneelta: [
        {
          nimi: "muuAineistoKoneelta äöå .png",
          uuid: "muuAineistoKoneelta-esitys-uuid", // Sama kuin ennen
        },
        {
          tiedosto: "upload-uuid/tiedostonimi.png",
          nimi: "muuAineistoKoneelta äöå 3.png",
          uuid: "muuAineistoKoneelta-esitys-uuid3", // Uusi
        },
      ],
    };
    // Asetetaan päiväys päivää myöhemmäksi kuin DB:ssä olevian tiedostojen ladattu-ajat.
    MockDate.set("2022-01-03");
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    // Haetaan tallentamisen jälkeen S3:ssa olevat tiedostot
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    // Poistettujen tiedostojen tulisi olla poistunut S3:sta, ja uusi LadattuTiedosto on lisätty sinne.
    expect(files.sort()).to.eql(
      [
        `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/${adaptFileName(
          "muuAineistoKoneelta äöå 3.png"
        )}`,
        ...TEST_HYVAKSYMISESITYS_FILES.map(({ path }) => `yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/${path}`),
      ].sort()
    );
    // Varmistetaan, että DynamoDB:ssä on oikeat tiedostot mainittuna
    const projektiAfter = await getProjektiFromDB(oid);
    const expectedMuokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
          nimi: "muuAineistoVelhosta äöå .png",
          uuid: "muuAineistoVelhosta-uuid",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
        // Tähän tiedostoon on viite Dynamossa, vaikka sitä ei olisi S3:ssa vielä
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid3",
          nimi: "muuAineistoVelhosta äöå 3.png",
          uuid: "muuAineistoVelhosta-uuid3",
          lisatty: "2022-01-03T02:00:00+02:00",
        },
      ],
      muuAineistoKoneelta: [
        {
          nimi: "muuAineistoKoneelta äöå .png",
          uuid: "muuAineistoKoneelta-esitys-uuid",
          lisatty: "2022-01-02T02:00:00+02:00",
        },
        {
          nimi: "muuAineistoKoneelta äöå 3.png",
          uuid: "muuAineistoKoneelta-esitys-uuid3",
          lisatty: "2022-01-03T02:00:00+02:00",
        },
      ],
    };
    expect(projektiAfter.muokattavaHyvaksymisEsitys).to.eql({
      ...omit(expectedMuokattavaHyvaksymisEsitys, ["muokkaaja", "vastanottajat"]),
      muokkaaja: "theadminuid",
      tila: API.HyvaksymisTila.MUOKKAUS,
      vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
    });
  });

  it("onnistuu, jos ei ole muokattavaa eikä julkaistua hyväksymisesitystä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      oid,
      versio: 2,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    const projektiAfter = await getProjektiFromDB(oid);
    const expectedMuokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS };
    expect(projektiAfter.muokattavaHyvaksymisEsitys).to.eql({
      ...omit(expectedMuokattavaHyvaksymisEsitys, ["muokkaaja", "vastanottajat"]),
      muokkaaja: "theadminuid",
      tila: API.HyvaksymisTila.MUOKKAUS,
      vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
    });
    expect(projektiAfter.paivitetty).to.eql("2022-01-02T02:00:00+02:00");
  });

  it("korvaa vanhat tiedot uusilla", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, poistumisPaiva: "2033-01-02", tila: API.HyvaksymisTila.MUOKKAUS };
    const projektiBefore = {
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
    };
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    const expectedMuokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS };
    expect(projektiAfter.muokattavaHyvaksymisEsitys).to.eql({
      ...omit(expectedMuokattavaHyvaksymisEsitys, ["muokkaaja", "vastanottajat"]),
      muokkaaja: "theadminuid",
      tila: API.HyvaksymisTila.MUOKKAUS,
      vastaanottajat: [{ sahkoposti: "vastaanottaja@sahkoposti.fi" }],
    });
  it("onnistuu projektikäyttäjältä", async () => {
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
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    await expect(kutsu).to.be.eventually.fulfilled;
  });

  it("persistoi inputissa annetut ladatut tiedostot", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      oid,
      versio: 2,
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

  it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    userFixture.loginAs(muokkaaja);

    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      oid,
      versio: 2,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
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
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
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
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  // TODO: "laukaisee oikeanlaisia tapahtumia, jos on uusia tiedostoja tai aineistoja"
});
