import { describe, it } from "mocha";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { useProjektiTestFixture } from "../api/testFixtureRecorder";
import { defaultMocks, expectJulkinenNotFound, expectStatusEiJulkaistu, mockSaveProjektiToVelho } from "../api/testUtil/util";
import {
  asetaAika,
  julkaiseSuunnitteluvaihe,
  listDocumentsToImport,
  loadProjektiFromDatabase,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
} from "../api/testUtil/tests";
import { KayttajaTyyppi, Projekti, Status } from "hassu-common/graphql/apiModel";
import { userService } from "../../src/user";
import { api } from "../api/apiClient";
import assert from "assert";
import { testImportNahtavillaoloAineistot, testNahtavillaolo, testNahtavillaoloApproval } from "../api/testUtil/nahtavillaolo";
import {
  testCreateHyvaksymisPaatosWithAineistot,
  testHyvaksymisPaatosVaihe,
  testHyvaksymisPaatosVaiheApproval,
  testHyvaksymisPaatosVaiheKuulutusVaihePaattyyPaivaMenneisyydessa,
} from "../api/testUtil/hyvaksymisPaatosVaihe";

/**
 * Testataan, että migraation tuloksena olevat projektit näkyvät ja käyttäytyvät oikein.
 * Periaate: välittömästi migraation jälkeen projekti näkyy vain virkamiehille. Kansalaisille projekti näkyy silloin kun virkamies on
 * julkaissut projektille muutakin kuin migroitua sisältöä.
 *
 * Aineistona käytetään migraatioskriptin tuottamien projektien snapshotteja tietokannasta. Päivittäminen:
 * cd migration-cli
 * npm i
 * npm run test
 */
describe("Migraatio", () => {
  const userFixture = new UserFixture(userService);
  const { eventSqsClientMock, awsCloudfrontInvalidationStub, schedulerMock } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
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
    await expectStatusEiJulkaistu(oid, userFixture);
    const projekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    // Ylläpitäjä täyttää puuttuvat puhelinnumerot käyttöliittymän kautta
    userFixture.loginAs(UserFixture.hassuAdmin);
    await tallennaPuhelinnumerot(projekti);
    await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await expectStatusEiJulkaistu(oid, userFixture);

    userFixture.loginAs(UserFixture.hassuAdmin);
    let p = await testSuunnitteluvaihePerustiedot(oid, 1, "Asetetaan suunnitteluvaiheen perusteidot migraation jälkeen", userFixture);
    userFixture.loginAs(UserFixture.hassuAdmin);
    p = await testSuunnitteluvaiheVuorovaikutus(
      p.oid,
      p.versio,
      UserFixture.hassuAdmin.uid as string,
      1,
      "Asetetaan vuorovaikutustiedot migroidulle projektille",
      userFixture
    );
    asetaAika(p.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);
    await schedulerMock.verifyAndRunSchedule();
    userFixture.loginAs(UserFixture.hassuAdmin);
    await julkaiseSuunnitteluvaihe(p, "Julkaistaan migroitu suunnitteluvaihe, jolle asetettu tiedot", userFixture);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    await testPublicAccessToProjekti(oid, Status.SUUNNITTELU, userFixture, "Suunnitteluvaiheeseen migroitu julkinen projekti");
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("nähtävilläolovaiheeseen migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_NAHTAVILLAOLO");
    await expectStatusEiJulkaistu(oid, userFixture);
    userFixture.loginAs(UserFixture.hassuAdmin);
    const initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    let projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    const projektipaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektipaallikko);
    projekti = await testNahtavillaolo(oid, projektipaallikko.kayttajatunnus);
    asetaAika(projekti.nahtavillaoloVaihe?.kuulutusPaiva);
    await schedulerMock.verifyAndRunSchedule();
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    projekti = await testImportNahtavillaoloAineistot(projekti, velhoToimeksiannot);
    await eventSqsClientMock.processQueue();
    await testNahtavillaoloApproval(
      projekti.oid,
      projektipaallikko,
      userFixture,
      Status.NAHTAVILLAOLO,
      "NahtavillaOloJulkinenAfterApproval"
    );
    await testPublicAccessToProjekti(oid, Status.NAHTAVILLAOLO, userFixture, "nähtävilläolovaiheeseen migroitu julkinen projekti");
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("hyväksymismenettelyyn migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    const oid = await useProjektiTestFixture("migraatio_HYVAKSYMISMENETTELYSSA");
    userFixture.loginAs(UserFixture.hassuAdmin);
    const initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    // Hyväksymismenettelyssä, koska puhelinnumerot täytetty ja aiemmat vaiheet migroitu-tilassa
    const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektiPaallikko);
    await testHyvaksymisPaatosVaihe(oid, userFixture);

    userFixture.loginAs(UserFixture.hassuAdmin);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    const p = await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoToimeksiannot,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY,
      "2025-01-01"
    );
    asetaAika(p.hyvaksymisPaatosVaihe?.kuulutusPaiva);
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    await testHyvaksymisPaatosVaiheApproval(p, projektiPaallikko, userFixture, eventSqsClientMock, Status.HYVAKSYTTY);
    await testHyvaksymisPaatosVaiheKuulutusVaihePaattyyPaivaMenneisyydessa(oid, projektiPaallikko, userFixture);
    await testPublicAccessToProjekti(oid, Status.HYVAKSYTTY, userFixture, "hyväksymismenettelyyn migroitu julkinen projekti");
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });

  it("epäaktiivinen-tilaan migroitu projekti", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2022-06-09");
    await schedulerMock.verifyAndRunSchedule();
    const oid = await useProjektiTestFixture("migraatio_EPAAKTIIVINEN_1");
    userFixture.loginAs(UserFixture.hassuAdmin);
    const initialProjekti = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
    await tallennaPuhelinnumerot(initialProjekti);

    // Epäaktiivinen, koska puhelinnumerot täytetty ja hyväksymispäätös migroitu-tilassa
    const projekti = await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_1);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assert(projektiPaallikko);

    await api.tallennaProjekti({
      oid,
      versio: projekti.versio,
      kasittelynTila: {
        ensimmainenJatkopaatos: { paatoksenPvm: "2022-06-09", asianumero: "jatkopaatos1_asianumero", aktiivinen: true },
      },
    });
    await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1_AINEISTOT);
    await expectJulkinenNotFound(oid, userFixture);
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });
});
