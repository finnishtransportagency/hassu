import sinon from "sinon";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2 } from "./TEST_HYVAKSYMISESITYS";
import { expect } from "chai";
import { TEST_PROJEKTI } from "./TEST_PROJEKTI";
import * as zipFunctions from "../../src/tiedostot/zipFiles";
import { zipHyvEsAineistot } from "../../src/HyvaksymisEsitys/aineistoHandling/aineistoHandler";
import { ZipSourceFile } from "../../src/tiedostot/zipFiles";
describe("Hyväksymisesitys-aineistolambdan apufunktio zipHyvEsAineistot", () => {
  let zipStub:
    | sinon.SinonStub<[bucket: string, zipSourceFiles: zipFunctions.ZipSourceFile[], zipFileS3Key: string], Promise<void>>
    | undefined;
  setupLocalDatabase();
  const oid = "Testi1";

  const projektiInDB = {
    ...TEST_PROJEKTI,
    muokattavaHyvaksymisEsitys: {
      ...TEST_HYVAKSYMISESITYS2,
      tila: API.HyvaksymisTila.MUOKKAUS,
    },
    julkaistuHyvaksymisEsitys: {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksyja: "theadminuid",
      hyvaksymisPaiva: "2022-01-01",
    },
  };

  before(async () => {
    zipStub = sinon.stub(zipFunctions, "generateAndStreamZipfileToS3");
  });

  beforeEach(async () => {
    // Aseta projekti DB:hen
    await insertProjektiToDB(projektiInDB);
  });

  afterEach(async () => {
    zipStub?.reset();
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
  });

  after(async () => {
    await removeProjektiFromDB(oid);
    sinon.reset();
    sinon.restore();
  });

  it("Ei kaadu", async () => {
    const kutsu = zipHyvEsAineistot(oid);
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("kutsuu zippausfunktiota oikealla parametrilla", async () => {
    await zipHyvEsAineistot(oid);

    const expectedArgs2 = [
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_2.png",
        zipFolder: "Hyväksymisesitys",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_2.png",
        zipFolder: "Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_2.png",
        zipFolder: "Muu aineisto",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_2.png",
        zipFolder: "Muu aineisto",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_2.png",
        zipFolder: "Suunnitelma",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_2.png",
        zipFolder: "Muistutukset/Helsinki",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T416 Maanomistajaluettelo 20240522.xlsx",
        zipFolder: "Maanomistajaluttelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_2.png",
        zipFolder: "Maanomistajaluettelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_2.png",
        zipFolder: "Lausunnot",
      },
    ];
    const sortFunc = (a: ZipSourceFile, b: ZipSourceFile) => a.s3Key.localeCompare(b.s3Key);
    expect(zipStub?.firstCall.args[0]).to.eql("hassu-localstack-yllapito");
    expect(zipStub?.firstCall.args[2]).to.eql("yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/aineisto.zip");
    expect(zipStub?.firstCall.args[1].sort(sortFunc)).to.eql(expectedArgs2.sort(sortFunc));
  });

  it("Päivittää dynamodb:hen tiedon zippauksesta", async () => {
    const projektiBefore = await getProjektiFromDB(oid);
    expect(projektiBefore.hyvEsAineistoPaketti).to.eql(undefined);
    await zipHyvEsAineistot(oid);
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.hyvEsAineistoPaketti).to.eql("hyvaksymisesitys/aineisto.zip");
  });
});
