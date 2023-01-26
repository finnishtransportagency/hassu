import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { MOCKED_TIMESTAMP, useProjektiTestFixture } from "../api/testFixtureRecorder";
import {
  CloudFrontStub,
  expectJulkinenNotFound,
  mockKirjaamoOsoitteet,
  mockSaveProjektiToVelho,
  PDFGeneratorStub,
} from "../api/testUtil/util";
import {
  julkaiseSuunnitteluvaihe,
  listDocumentsToImport,
  loadProjektiFromDatabase,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
} from "../api/testUtil/tests";
import { KayttajaTyyppi, Projekti, Status } from "../../../common/graphql/apiModel";
import { userService } from "../../src/user";
import { api } from "../api/apiClient";
import assert from "assert";
import { testImportNahtavillaoloAineistot, testNahtavillaolo, testNahtavillaoloApproval } from "../api/testUtil/nahtavillaolo";
import {
  testCreateHyvaksymisPaatosWithAineistot,
  testHyvaksymisPaatosVaihe,
  testHyvaksymisPaatosVaiheApproval,
} from "../api/testUtil/hyvaksymisPaatosVaihe";
import { ImportAineistoMock } from "../api/testUtil/importAineistoMock";

/**
 * Testataan, että migraation tuloksena olevat projektit näkyvät ja käyttäytyvät oikein.
 * Periaate: välittömästi migraation jälkeen projekti näkyy vain virkamiehille. Kansalaisille projekti näkyy silloin kun virkamies on
 * julkaissut projektille muutakin kuin migroitua sisältöä.
 *
 * Aineistona käytetään migraatioskriptin tuottamien projektien snapshotteja tietokannasta.
 */
describe("Migraatio", () => {
  let userFixture: UserFixture;
  let importAineistoMock: ImportAineistoMock;
  const pdfGeneratorStub = new PDFGeneratorStub();
  let awsCloudfrontInvalidationStub: CloudFrontStub;
  mockKirjaamoOsoitteet();

  before(async () => {
    await setupLocalDatabase();
    mockSaveProjektiToVelho();
    importAineistoMock = new ImportAineistoMock();
    userFixture = new UserFixture(userService);
    pdfGeneratorStub.init();
    awsCloudfrontInvalidationStub = new CloudFrontStub();
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  async function tallennaPuhelinnumerot(projekti: Projekti) {
    assert(projekti.kayttoOikeudet);
    await api.tallennaProjekti({
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet: projekti.kayttoOikeudet.map((kayttaja) => ({
        tyyppi: kayttaja.tyyppi,
        kayttajatunnus: kayttaja.kayttajatunnus,
        puhelinnumero: "0291111111",
        yleinenYhteystieto: kayttaja.yleinenYhteystieto,
      })),
    });
  }

  it("suunnitteluvaiheeseen migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_SUUNNITTELU");
    await expectJulkinenNotFound(oid, userFixture);
    let projekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    // Ylläpitäjä täyttää puuttuvat puhelinnumerot käyttöliittymän kautta
    userFixture.loginAs(UserFixture.hassuAdmin);
    await tallennaPuhelinnumerot(projekti);
    await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await expectJulkinenNotFound(oid, userFixture);

    userFixture.loginAs(UserFixture.hassuAdmin);
    let p = await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(p, UserFixture.hassuAdmin.uid as string);
    await julkaiseSuunnitteluvaihe(oid, userFixture);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    await testPublicAccessToProjekti(oid, Status.SUUNNITTELU, userFixture, "suunnitteluvaiheeseen migroitu julkinen projekti");
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("nähtävilläolovaiheeseen migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_NAHTAVILLAOLO");
    await expectJulkinenNotFound(oid, userFixture);
    userFixture.loginAs(UserFixture.hassuAdmin);
    let initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    let projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    const projektipaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektipaallikko);
    projekti = await testNahtavillaolo(oid, projektipaallikko.kayttajatunnus);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    await testImportNahtavillaoloAineistot(projekti, velhoToimeksiannot);
    await importAineistoMock.processQueue();
    await testNahtavillaoloApproval(oid, projektipaallikko, userFixture);
    await testPublicAccessToProjekti(oid, Status.NAHTAVILLAOLO, userFixture, "nähtävilläolovaiheeseen migroitu julkinen projekti");
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("hyväksymismenettelyyn migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_HYVAKSYMISMENETTELYSSA");
    userFixture.loginAs(UserFixture.hassuAdmin);
    let initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    // Hyväksymismenettelyssä, koska puhelinnumerot täytetty ja aiemmat vaiheet migroitu-tilassa
    const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektiPaallikko);
    await testHyvaksymisPaatosVaihe(oid, userFixture);

    userFixture.loginAs(UserFixture.hassuAdmin);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoToimeksiannot,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY
    );
    await importAineistoMock.processQueue();
    await testHyvaksymisPaatosVaiheApproval(oid, projektiPaallikko, userFixture);
    await testPublicAccessToProjekti(oid, Status.HYVAKSYTTY, userFixture, "hyväksymismenettelyyn migroitu julkinen projekti");
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("epäaktiivinen-tilaan migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_EPAAKTIIVINEN_1");
    userFixture.loginAs(UserFixture.hassuAdmin);
    let initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    // Epäaktiivinen, koska puhelinnumerot täytetty ja hyväksymispäätös migroitu-tilassa
    const projekti = await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_1);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektiPaallikko);

    await api.tallennaProjekti({
      oid,
      versio: projekti.versio,
      kasittelynTila: {
        ensimmainenJatkopaatos: { paatoksenPvm: MOCKED_TIMESTAMP, asianumero: "jatkopaatos1_asianumero", aktiivinen: true },
      },
    });
    await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1_AINEISTOT);
    await expectJulkinenNotFound(oid, userFixture);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });
});
