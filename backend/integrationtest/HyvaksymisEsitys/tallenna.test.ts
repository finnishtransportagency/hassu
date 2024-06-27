import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS_INPUT, {
  INPUTIN_LADATUT_TIEDOSTOT,
  TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
} from "./TEST_HYVAKSYMISESITYS_INPUT";
import { tallennaHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { UserFixture } from "../../test/fixture/userFixture";
import { deleteYllapitoFiles, emptyUploadFiles, getYllapitoFilesUnderPath, insertUploadFileToS3, insertYllapitoFileToS3 } from "./util";
import { expect } from "chai";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { cloneDeep, omit } from "lodash";
import MockDate from "mockdate";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { adaptFileName } from "../../src/tiedostot/paths";
import { ValidationError } from "yup";
import { SqsClient } from "../../src/HyvaksymisEsitys/aineistoHandling/sqsClient";
import { SqsEvent } from "../../src/HyvaksymisEsitys/aineistoHandling/sqsEvent";
import { DeepReadonly } from "hassu-common/specialTypes";
import { parameters } from "../../src/aws/parameters";

const projari = UserFixture.pekkaProjari;
const projariAsVaylaDBUser: DBVaylaUser = {
  kayttajatunnus: projari.uid!,
  tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  etunimi: "Pekka",
  sukunimi: "Projari",
  email: "pekka.projari@vayla.fi",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};
const muokkaaja = UserFixture.manuMuokkaaja;
const muokkaajaAsVaylaDBUser: DBVaylaUser = {
  kayttajatunnus: muokkaaja.uid!,
  etunimi: "Manu",
  sukunimi: "Muokkaaja",
  email: "namu.muokkaaja@vayla.fi",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};

const oid = "Testi1";
const date = "2022-01-02"; // Sama aika kuin testidatassa
const getProjektiBase: () => DeepReadonly<DBProjekti> = () => ({
  oid,
  versio: 2,
  kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  vuorovaikutusKierros: { tila: API.VuorovaikutusKierrosTila.MIGROITU, vuorovaikutusNumero: 1 },
  asianhallinta: { inaktiivinen: true },
  euRahoitus: false,
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  velho: {
    nimi: "Projektin nimi",
    asiatunnusVayla: "asiatunnusVayla",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    kunnat: [91, 92],
  },
});

describe("Hyväksymisesityksen tallentaminen", () => {
  const userFixture = new UserFixture(userService);
  let addEventToSqsQueueMock: sinon.SinonStub<[params: SqsEvent, retry?: boolean | undefined], Promise<void>> | undefined;
  setupLocalDatabase();

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
    await emptyUploadFiles();
    addEventToSqsQueueMock = sinon.stub(SqsClient, "addEventToSqsQueue");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
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
    addEventToSqsQueueMock?.reset();
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

    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
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

  it("tallentaa kiireellisyyden muutoksen tietokantaan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
      kiireellinen: false,
    };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys.kiireellinen).to.eql(false);
  });

  it("tallentaa hyväksymisesitystiedostot annetussa järjestyksessä tietokantaan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisEsitys: [
        {
          nimi: `hyvaksymisEsitys äöå 2.png`,
          uuid: `hyvaksymis-esitys-uuid2`,
          lisatty: "2022-01-02T02:00:00+02:00",
        },
        {
          nimi: `hyvaksymisEsitys äöå .png`,
          uuid: `hyvaksymis-esitys-uuid`,
          lisatty: "2022-01-02T02:00:00+02:00",
        },
      ],
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
      hyvaksymisEsitys: [
        {
          nimi: `hyvaksymisEsitys äöå .png`,
          uuid: `hyvaksymis-esitys-uuid`,
        },
        {
          nimi: `hyvaksymisEsitys äöå 2.png`,
          uuid: `hyvaksymis-esitys-uuid2`,
        },
      ],
    };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    // Järjestys vastaa inputissa annettua, vaikka se oli alun perin db:ssä toisin päin
    expect(projektiAfter.muokattavaHyvaksymisEsitys.hyvaksymisEsitys).to.eql([
      {
        nimi: `hyvaksymisEsitys äöå .png`,
        uuid: `hyvaksymis-esitys-uuid`,
        lisatty: "2022-01-02T02:00:00+02:00",
      },
      {
        nimi: `hyvaksymisEsitys äöå 2.png`,
        uuid: `hyvaksymis-esitys-uuid2`,
        lisatty: "2022-01-02T02:00:00+02:00",
      },
    ]);
    expect(projektiAfter.paivitetty).to.eql("2022-01-02T02:00:00+02:00");
  });

  it("vaatii OVT-tunnuksen inputissa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT);
    delete muokattavaHyvaksymisEsitysInput.laskutustiedot?.ovtTunnus;
    const tallenna = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    await expect(tallenna).to.eventually.be.rejectedWith(ValidationError, "OVT-tunnus on annettava");
  });

  it("OVT-tunnus ei ole pakollinen (voi olla '')", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const { laskutustiedot = {}, ...muokattavaHyvaksymisEsitysInput }: API.HyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT);
    const tallenna = tallennaHyvaksymisEsitys({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitysInput, laskutustiedot: { ...laskutustiedot, ovtTunnus: "" } },
    });
    await expect(tallenna).to.eventually.be.fulfilled;
  });

  it("vaatii vastaanottajalistan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const { vastaanottajat: _v, ...muokattavaHyvaksymisEsitysInput }: API.HyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT);
    const tallenna = tallennaHyvaksymisEsitys({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitysInput },
    });
    await expect(tallenna).to.eventually.be.rejectedWith(ValidationError, "muokattavaHyvaksymisEsitys.vastaanottajat must be defined");
  });

  it("vaatii vähintään yhden vastaanottajan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const { vastaanottajat: _v, ...muokattavaHyvaksymisEsitysInput }: API.HyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT);
    const tallenna = tallennaHyvaksymisEsitys({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitysInput, vastaanottajat: [] },
    });
    await expect(tallenna).to.eventually.be.rejectedWith(
      ValidationError,
      "muokattavaHyvaksymisEsitys.vastaanottajat field must have at least 1 items"
    );
  });

  it("vastaanottajan sähköposti voi olla tyhjä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const { vastaanottajat: _v, ...muokattavaHyvaksymisEsitysInput }: API.HyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT);
    const tallenna = tallennaHyvaksymisEsitys({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitysInput, vastaanottajat: [{ sahkoposti: "" }] },
    });
    await expect(tallenna).to.eventually.be.fulfilled;
  });

  it("poistaa tiedostot, jotka tiputettiin muokattavasta hyväksymisesityksestä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore = {
      ...getProjektiBase(),
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
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
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
    await insertProjektiToDB(getProjektiBase());
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
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      poistumisPaiva: "2033-01-02",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
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
  });

  it("onnistuu projektikäyttäjältä", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    await insertProjektiToDB(getProjektiBase());
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    await expect(kutsu).to.be.eventually.fulfilled;
  });

  it("persistoi inputissa annetut ladatut tiedostot", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    await insertProjektiToDB(getProjektiBase());
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
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    const projektiBefore = {
      ...getProjektiBase(),
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos status on liian pieni", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT,
    };
    // Poistetaan eurahoitus ja kielitiedot, jotta projektin statukseksi tulee EI_JULKAISTU
    const { euRahoitus: _eu, kielitiedot: _kt, ...projekti } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projekti,
    };
    await insertProjektiToDB(projektiBefore);
    await Promise.all(INPUTIN_LADATUT_TIEDOSTOT.map(({ nimi, uuid }) => insertUploadFileToS3(uuid, nimi)));
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys });
    await expect(kutsu).to.be.eventually.rejectedWith(IllegalArgumentError, "Projektin hyväksymisesitysvaihe ei ole aktiivinen");
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
      poistumisPaiva: "2022-01-03",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
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
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei ylikirjoita aineistoHandledAt-tietoa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    await expect(projektiAfter.aineistoHandledAt).to.eql("2022-01-02T03:00:00+02:00");
  });

  it("laukaisee oikeanlaisen tapahtuman, jos on uusi aineisto", async () => {
    userFixture.loginAsAdmin();
    // Luodaan DB:ssä olevan hyväksymisesityksen data
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,

      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    // Asetetaan DB:ssä olevan projektin data
    await insertProjektiToDB(projektiBefore);

    // Luodaan inputin data
    const muokattavaHyvaksymisEsitysInput: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid",
          nimi: "muuAineistoVelhosta äöå .png",
          uuid: "muuAineistoVelhosta-uuid",
        },
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid2",
          nimi: "muuAineistoVelhosta äöå 2.png",
          uuid: "muuAineistoVelhosta-uuid2",
        },
      ],
    };
    await tallennaHyvaksymisEsitys({ oid, versio: 2, muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitysInput });
    expect(addEventToSqsQueueMock?.calledOnce).to.be.true;
    expect(addEventToSqsQueueMock?.firstCall.args?.[0]).to.eql({ operation: "TUO_HYV_ES_AINEISTOT", oid: "Testi1" });
  });
});
