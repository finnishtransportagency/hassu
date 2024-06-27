import sinon from "sinon";
import { userService } from "../../src/user";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2, TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { deleteYllapitoFiles, getYllapitoFilesUnderPath, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { avaaHyvaksymisEsityksenMuokkaus } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBVaylaUser, DBProjekti } from "../../src/database/model";
import omit from "lodash/omit";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { DeepReadonly } from "hassu-common/specialTypes";

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

describe("Hyväksymisesityksen avaaHyvaksymisEsityksenMuokkaus", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
  });

  beforeEach(async () => {
    // Aseta julkaistulle ja muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
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

  it("asettaa muokattavan hyväksymisesityksen muokkaustilaan", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2022-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const projektiAfter = await getProjektiFromDB(oid);
    // Testaa, että muokattava hyvksymisesitys on hyväksytty-tilassa ja että sen tiedot vastaavat julkaistua hyväksymisesitystä
    expect(omit(projektiAfter, "paivitetty")).to.eql({
      ...projektiBefore,
      versio: 3,
      muokattavaHyvaksymisEsitys: {
        ...muokattavaHyvaksymisEsitys,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
  });

  it("onnistuu projektikayttajalta", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2022-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.to.be.fulfilled;
  });

  it("ei muokkaa tiedostoja", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2022-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const filesBefore = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    await avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    const filesAfter = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    // Testaa että tiedostot ovat yhä samat
    expect(filesBefore.sort()).to.eql(filesAfter.sort());
  });

  it("ei onnistu ulkopuoliselta", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    };
    const projektiBefore = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos ei ole julkaistua hyväksymisesitystä", async () => {
    userFixture.loginAsAdmin();
    // Ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError, "Projektilla ei ole julkaistua hyväksymisesitystä");
  });

  it("ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2022-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektin tulee olla lukutilassa, jotta muokkauksen voi avata."
    );
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on jo muokkauksessa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    };
    const projektiBefore = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektin tulee olla lukutilassa, jotta muokkauksen voi avata."
    );
  });

  it("onnistuu vaikka ollaan jo hyväksymisvaiheessa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2022-01-02",
    };
    const hyvaksymisPaatosVaihe = {
      id: 1,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = avaaHyvaksymisEsityksenMuokkaus({ oid, versio: 2 });
    await expect(kutsu).to.eventually.be.fulfilled;
  });
});
