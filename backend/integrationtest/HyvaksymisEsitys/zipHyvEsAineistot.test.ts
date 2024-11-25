import sinon from "sinon";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import * as API from "hassu-common/graphql/apiModel";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2 } from "./TEST_HYVAKSYMISESITYS";
import { expect } from "chai";
import { TEST_PROJEKTI } from "./TEST_PROJEKTI";
import * as zipFunctions from "../../src/tiedostot/zipFiles";
import { zipHyvEsAineistot } from "../../src/HyvaksymisEsitys/aineistoHandling/aineistoHandler";
import { ZipSourceFile } from "../../src/tiedostot/zipFiles";
import { cloneDeepWith } from "lodash";
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
    // Aseta projekti DB:hen
    await insertProjektiToDB(projektiInDB);
    const kutsu = zipHyvEsAineistot(oid);
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("kutsuu zippausfunktiota oikealla parametrilla", async () => {
    // Aseta projekti DB:hen
    await insertProjektiToDB(projektiInDB);
    await zipHyvEsAineistot(oid);

    const expectedArgs2 = [
      {
        s3Key: "yllapito/sisaiset/projekti/Testi1/nahtavillaolo/1/T416 Maanomistajaluettelo 20240522.xlsx",
        zipFolder: "Vuorovaikutusaineisto/Maanomistajaluettelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/aloituskuulutus/1/T412 Aloituskuulutus sv.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/aloituskuulutus/1/T412 Aloituskuulutus.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_2.png",
        zipFolder: "Hyväksymisesitys",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Lausunnot",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Maanomistajaluettelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Muistutukset/Helsinki",
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
        zipFolder: "Pääpiirustukset/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo sv.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T415 Ilmoitus kiinteistönomistajille suunnitelman nähtävilläolo sv.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T415 Ilmoitus kiinteistönomistajille suunnitelman nähtävilläolo.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen sv.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen sv.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
    ];
    const sortFunc = (a: ZipSourceFile, b: ZipSourceFile) => a.s3Key.localeCompare(b.s3Key);
    const cleanUpFunc = (a: ZipSourceFile) => ({ s3Key: a.s3Key, zipFolder: a.zipFolder });
    expect(zipStub?.firstCall.args[0]).to.eql("hassu-localstack-yllapito");
    expect(zipStub?.firstCall.args[2]).to.eql("yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/aineisto.zip");
    expect(zipStub?.firstCall.args[1].map(cleanUpFunc).sort(sortFunc)).to.eql(expectedArgs2.sort(sortFunc));
  });

  it("kutsuu zippausfunktiota oikealla parametrilla, kun projekti on saamenkielinen", async () => {
    const projektiInDBSaame = {
      ...cloneDeepWith(projektiInDB, (value, key) => {
        if (key == API.Kieli.RUOTSI) {
          return null;
        }
      }),
      kielitiedot: {
        ensisijainenKieli: API.Kieli.SUOMI,
        toissijainenKieli: API.Kieli.POHJOISSAAME,
        projektinNimiVieraskielella: "Saamenkielinen nimi",
      },
    };
    // Aseta projekti DB:hen
    await insertProjektiToDB(projektiInDBSaame);
    await zipHyvEsAineistot(oid);

    const expectedArgs2 = [
      {
        s3Key: "yllapito/sisaiset/projekti/Testi1/nahtavillaolo/1/T416 Maanomistajaluettelo 20240522.xlsx",
        zipFolder: "Vuorovaikutusaineisto/Maanomistajaluettelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/aloituskuulutus/1/T412 Aloituskuulutus se.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/aloituskuulutus/1/T412 Aloituskuulutus.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_2.png",
        zipFolder: "Hyväksymisesitys",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Lausunnot",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Maanomistajaluettelo",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_2.png",
        zipFolder: "Vuorovaikutusaineisto/Muistutukset/Helsinki",
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
        zipFolder: "Pääpiirustukset/",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo se.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T414 Kuulutus suunnitelman nähtävilläolo.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/nahtavillaolo/1/T415 Ilmoitus kiinteistönomistajille suunnitelman nähtävilläolo.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen se.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen se.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
      {
        s3Key: "yllapito/tiedostot/projekti/Testi1/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen.pdf",
        zipFolder: "Vuorovaikutusaineisto/Kuulutukset ja kutsut",
      },
    ];
    const sortFunc = (a: ZipSourceFile, b: ZipSourceFile) => a.s3Key.localeCompare(b.s3Key);
    const cleanUpFunc = (a: ZipSourceFile) => ({ s3Key: a.s3Key, zipFolder: a.zipFolder });
    expect(zipStub?.firstCall.args[0]).to.eql("hassu-localstack-yllapito");
    expect(zipStub?.firstCall.args[2]).to.eql("yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/aineisto.zip");
    expect(zipStub?.firstCall.args[1].map(cleanUpFunc).sort(sortFunc)).to.eql(expectedArgs2.sort(sortFunc));
  });

  it("Päivittää dynamodb:hen tiedon zippauksesta", async () => {
    // Aseta projekti DB:hen
    await insertProjektiToDB(projektiInDB);
    const projektiBefore = await getProjektiFromDB(oid);
    expect(projektiBefore.hyvEsAineistoPaketti).to.eql(undefined);
    await zipHyvEsAineistot(oid);
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.hyvEsAineistoPaketti).to.eql("hyvaksymisesitys/aineisto.zip");
  });
});
