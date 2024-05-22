import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import * as API from "hassu-common/graphql/apiModel";
import { esikatseleHyvaksymisEsityksenTiedostot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { adaptFileName } from "../../src/tiedostot/paths";
import { TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO } from "./TEST_HYVAKSYMISESITYS_INPUT";

describe("Hyväksymisesityksen tiedostojen esikatselu", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";
  const alternativeHyvaksymisEsitysName = `hyvaksymisEsitys äöå ALTERNATIVE.png`;
  const alternativeHyvaksymisEsitysUuid = `hyvaksymis-esitys-uuid-ALT`;
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
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een.
    // Yksi tiedostoista on eri kuin hyväksytyllä hyväksymisesityksellä.
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        if (!path.includes("hyvaksymisEsitys")) {
          const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
          await insertYllapitoFileToS3(fullpath);
        }
      })
    );
    await insertYllapitoFileToS3(
      `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/hyvaksymisEsitys/${adaptFileName(alternativeHyvaksymisEsitysName)}`
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
        ...TEST_HYVAKSYMISESITYS,
        hyvaksymisEsitys: [
          {
            nimi: alternativeHyvaksymisEsitysName,
            uuid: alternativeHyvaksymisEsitysUuid,
            lisatty: "2022-01-02T02:00:00+02:00",
          },
        ],
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const alternativeMuistutuksetName = "muistutukset äöå 2.png";
    const alternativeMuuAineistoVelhostaName = "muuAineistoVelhosta äöå 2.png";
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      hyvaksymisEsitys: [
        {
          nimi: alternativeHyvaksymisEsitysName,
          uuid: alternativeHyvaksymisEsitysUuid,
        },
      ],
      // eri kuin db:ssä
      muistutukset: [
        {
          kunta: 2,
          nimi: alternativeMuistutuksetName,
          uuid: "muistutukset-esitys-uuid-TALLENTAMATON",
        },
      ],
      // eri kuin db:ssä
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid-UUSI",
          nimi: alternativeMuuAineistoVelhostaName,
          uuid: "muuAineistoVelhosta-uuid-TALLENTAMATON",
        },
      ],
    };
    const ladattavatTiedostot = await esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...(value as API.LadattavaTiedosto[] | API.KunnallinenLadattavaTiedosto[]));
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const nimet = ladattavatTiedostotList.map(({ nimi }) => nimi);
    const expectedFileNames = [
      ...TEST_PROJEKTI_FILES.map((file) => file.nimi)
        .filter((nimi) => !nimi.includes("lähetekirje"))
        .filter((nimi) => !nimi.includes("vuorovaikutusaineisto"))
        .filter((nimi) => !nimi.includes("nähtävilläoloaineisto")),
      ...TEST_HYVAKSYMISESITYS_FILES.map((file) => file.nimi)
        .filter((nimi) => !nimi.includes("hyvaksymisEsitys"))
        .filter((nimi) => !nimi.includes("muistutukset"))
        .filter((nimi) => !nimi.includes("muuAineistoVelhosta")),
      alternativeHyvaksymisEsitysName,
      alternativeMuistutuksetName,
      alternativeMuuAineistoVelhostaName,
    ];
    expect(nimet.sort()).to.eql(expectedFileNames.sort());
  });

  it("ei mene sekaisin siitä, että aloituskuulutuksella on tyhjä objekti pohjoissaame-pdf:ssä", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      aloitusKuulutuJulkaisut: [
        {
          ...TEST_PROJEKTI.aloitusKuulutusJulkaisut?.[0],
          aloituskuulutusSaamePDFt: {
            POHJOISSAAME: {},
          },
        },
      ],
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
    };
    const kutsu = esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    await expect(kutsu).to.be.eventually.fulfilled;
  });
});
