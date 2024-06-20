import sinon from "sinon";
import { userService } from "../../src/user";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
import { haeHyvaksymisEsityksenTiedot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBProjekti, JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../src/database/model";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import { deleteYllapitoFiles, insertYllapitoFileToS3 } from "./util";
import axios from "axios";

const oid = "Testi1";
const getProjektiBase: () => DBProjekti = () => ({
  oid,
  versio: 2,
  salt: "salt",
  velho: {
    nimi: "Projektin nimi",
    asiatunnusVayla: "asiatunnus",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    kunnat: [91, 92],
  },
  vuorovaikutusKierros: { tila: API.VuorovaikutusKierrosTila.MIGROITU, vuorovaikutusNumero: 1 },
  asianhallinta: { inaktiivinen: true },
  euRahoitus: false,
  kielitiedot: {
    ensisijainenKieli: API.Kieli.SUOMI,
    toissijainenKieli: API.Kieli.RUOTSI,
    projektinNimiVieraskielella: "Ruotsinkielinen nimi",
  },
  kayttoOikeudet: [],
});

describe("HaeHyvaksymisEsityksenTiedot", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();

  afterEach(async () => {
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
  });

  after(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    sinon.reset();
    sinon.restore();
  });

  it("antaa muokkauksenVoiAvata=true, kun hyväksymisesitys on hyväksytty ja hyväksymispäätösvaihetta ei vielä ole", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;

    const projektiBefore: DBProjekti = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.true;
  });

  it("palauttaa tiedostot siinä järjestyksessä kuin ne ovat tietokannassa", async () => {
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
          lisatty: "2022-01-03T02:00:00+02:00",
        },
        {
          nimi: `hyvaksymisEsitys äöå 2.png`,
          uuid: `hyvaksymis-esitys-uuid3`,
          lisatty: "2022-01-01T02:00:00+02:00",
        },
      ],
      tila: API.HyvaksymisTila.MUOKKAUS,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.hyvaksymisEsitys?.hyvaksymisEsitys?.map((t) => t.nimi)).to.eql([
      "hyvaksymisEsitys äöå 2.png",
      "hyvaksymisEsitys äöå .png",
      "hyvaksymisEsitys äöå 2.png",
    ]);
  });

  it("antaa muokkauksenVoiAvata=true, kun hyväksymisesitys on hyväksytty ja hyväksymispäätösvaihe on olemassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe: { id: 1 },
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.true;
  });

  it("antaa projektin perustiedot", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.perustiedot).to.eql({
      __typename: "ProjektinPerustiedot",
      suunnitelmanNimi: "Projektin nimi",
      asiatunnus: "asiatunnus",
      vastuuorganisaatio: "VAYLAVIRASTO",
      kunnat: [91, 92],
      yTunnus: "1010547-1",
    });
  });

  it("antaa aiemmista vaiheista kuulutukset ja kutsut", async () => {
    // Aseta projektille tiedostoja S3:een
    await Promise.all(
      TEST_PROJEKTI_FILES.map(async ({ tiedosto }) => {
        const path = `yllapito/tiedostot/projekti/${oid}${tiedosto}`;
        await insertYllapitoFileToS3(path);
      })
    );
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    } as unknown as MuokattavaHyvaksymisEsitys;
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
    } as unknown as JulkaistuHyvaksymisEsitys;
    const projektiBefore: DBProjekti = {
      ...(TEST_PROJEKTI as Partial<DBProjekti>),
      ...getProjektiBase(),
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.tuodutTiedostot.maanomistajaluettelo?.length).to.eql(1);
    expect(tiedot.tuodutTiedostot.maanomistajaluettelo?.[0].nimi).to.eql("T416 Maanomistajaluettelo 20240522.xlsx");
    const lataus1 = axios.get(tiedot.tuodutTiedostot.maanomistajaluettelo?.[0].linkki as string);
    await expect(lataus1).to.eventually.be.fulfilled;
    expect(tiedot.tuodutTiedostot.kuulutuksetJaKutsu?.length).to.eql(12);
    for (const tiedosto of tiedot.tuodutTiedostot.kuulutuksetJaKutsu!) {
      await expect(axios.get(tiedosto.linkki as string)).to.eventually.be.fulfilled;
    }
  });
});
