import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertProjektiToDB, insertYllapitoFileToS3, removeProjektiFromDB } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { setupLocalDatabase } from "../util/databaseUtil";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import * as API from "hassu-common/graphql/apiModel";
import { haeHyvaksymisEsityksenTiedot, listaaHyvaksymisEsityksenTiedostot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { assertIsDefined } from "../../src/util/assertions";

describe("Hyväksymisesityksen tiedostojen listaaminen (aineistolinkin katselu)", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
  });

  beforeEach(async () => {
    // Aseta projektille tiedostoja S3:een
    await Promise.all(
      TEST_PROJEKTI_FILES.map(async ({ tiedosto }) => {
        const path = `yllapito/tiedostot/projekti/${oid}${tiedosto}`;
        await insertYllapitoFileToS3(path);
      })
    );
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
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

  it("antaa oikeat tiedostot", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS2,
        tila: API.HyvaksymisTila.HYVAKSYTTY,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const { hyvaksymisEsitys } = await haeHyvaksymisEsityksenTiedot(oid);
    userFixture.logout(); // Halutaan testata tiedostojen listaaminen kirjautumattomana käyttäjänä!
    expect(hyvaksymisEsitys).to.exist;
    assertIsDefined(hyvaksymisEsitys, "On juuri testattu, että hyväksymisesitys on olemassa");
    const { hash } = hyvaksymisEsitys;
    const ladattavatTiedostot = await listaaHyvaksymisEsityksenTiedostot({ oid, listaaHyvaksymisEsityksenTiedostotInput: { hash } });
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...(value as API.LadattavaTiedosto[] | API.KunnallinenLadattavaTiedosto[]));
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const nimet = ladattavatTiedostotList.map(({ nimi }) => nimi);
    const expectedFileNames = [...TEST_PROJEKTI_FILES.map((file) => file.nimi), ...TEST_HYVAKSYMISESITYS_FILES.map((file) => file.nimi)]
      .filter((nimi) => !nimi.includes("lähetekirje"))
      .filter((nimi) => !nimi.includes("vuorovaikutusaineisto"))
      .filter((nimi) => !nimi.includes("nähtävilläoloaineisto"));
    expect(nimet.sort()).to.eql(expectedFileNames.sort());
  });
});
