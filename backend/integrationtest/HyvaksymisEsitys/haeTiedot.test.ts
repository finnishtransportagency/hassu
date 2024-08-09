import sinon from "sinon";
import { userService } from "../../src/user";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS from "./TEST_HYVAKSYMISESITYS";
import { haeHyvaksymisEsityksenTiedot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { DBProjekti } from "../../src/database/model";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import { deleteYllapitoFiles, insertYllapitoFileToS3 } from "./util";
import axios from "axios";
import { DeepReadonly } from "hassu-common/specialTypes";
import { parameters } from "../../src/aws/parameters";
import * as lambda from "../../src/aws/lambda";
import omit from "lodash/omit";

const oid = "Testi1";
const getProjektiBase: () => DeepReadonly<DBProjekti> = () => ({
  oid,
  versio: 2,
  salt: "salt",
  velho: {
    nimi: "Projektin nimi",
    asiatunnusVayla: "asiatunnus",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    kunnat: [91, 92],
    tyyppi: API.ProjektiTyyppi.TIE,
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
  let ashaLambdaStub:
    | sinon.SinonStub<[functionName: string, asynchronousCall: boolean, payload?: string | undefined], Promise<string | undefined>>
    | undefined;
  let ashaParamStub: sinon.SinonStub<[], Promise<boolean>> | undefined;

  before(() => {
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "getAshaBaseUrl").resolves("ashabaseurl");
  });

  beforeEach(() => {
    ashaParamStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
  });

  afterEach(async () => {
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
    ashaLambdaStub?.restore();
    ashaParamStub?.restore();
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
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };

    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.true;
  });

  it("palauttaa tiedon ashan ja asha-synkronisaation tilasta hyväksymisesityksen suhteen", async () => {
    ashaLambdaStub = sinon.stub(lambda, "invokeLambda").resolves(`{ "synkronointiTila": "VALMIS_VIENTIIN" }`);
    ashaParamStub?.restore();
    ashaParamStub = sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(true);

    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };

    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      asianhallinta: { inaktiivinen: false, asiaId: 123 },
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.ashaTila).to.eql(API.AsianTila.VALMIS_VIENTIIN);
    expect(omit(tiedot.asianhallinta, "__typename")).to.eql({
      aktivoitavissa: true,
      inaktiivinen: false,
      linkkiAsianhallintaan: "ashabaseurl/group/asianhallinta/asianhallinta/-/case/123/view",
    });
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
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
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
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe: { id: 1 },
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.muokkauksenVoiAvata).to.be.true;
  });

  it("antaa vaiheOnAktiivinen=false ja muokkauksenVoiAvata=false, jos projektin status on liian pieni", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };
    //Poistetaan vaadittuja tietoja, jotta status laskee EI_JULKAISTU:ksi
    const { euRahoitus: _eu, kielitiedot: _kt, ...projekti } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projekti,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe: { id: 1 },
    };
    await insertProjektiToDB(projektiBefore);
    const tiedot = await haeHyvaksymisEsityksenTiedot(oid);
    expect(tiedot.vaiheOnAktiivinen).to.be.false;
    expect(tiedot.muokkauksenVoiAvata).to.be.false;
  });

  it("antaa projektin perustiedot", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
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
      projektiTyyppi: API.ProjektiTyyppi.TIE,
    });
  });

  it("antaa aiemmista vaiheista kuulutukset ja kutsut", async () => {
    // Aseta projektille tiedostoja S3:een
    await Promise.all(
      TEST_PROJEKTI_FILES.map(async ({ tiedosto }) => {
        let path;
        if (tiedosto.includes("Maanomistajaluettelo")) {
          path = `yllapito/sisaiset/projekti/${oid}${tiedosto}`;
        } else {
          path = `yllapito/tiedostot/projekti/${oid}${tiedosto}`;
        }
        await insertYllapitoFileToS3(path);
      })
    );
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksymisPaiva: "2022-01-01",
      hyvaksyja: "oid",
      poistumisPaiva: "2033-01-02",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
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
    expect(tiedot.tuodutTiedostot.kuulutuksetJaKutsu?.length).to.eql(10);
    for (const tiedosto of tiedot.tuodutTiedostot.kuulutuksetJaKutsu!) {
      await expect(axios.get(tiedosto.linkki as string)).to.eventually.be.fulfilled;
    }
  });
});
