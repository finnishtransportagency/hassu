/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { cleanupAnyProjektiData, FixtureName, useProjektiTestFixture } from "./testFixtureRecorder";
import {
  asetaAika,
  deleteProjekti,
  findProjektiPaallikko,
  loadProjektiFromDatabase,
  tallennaEULogo,
  testPublicAccessToProjekti,
} from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import {
  AineistoTila,
  KuulutusJulkaisuTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "hassu-common/graphql/apiModel";
import { api } from "./apiClient";
import {
  doTestApproveAndPublishHyvaksymisPaatos,
  tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa,
  testCreateHyvaksymisPaatosWithAineistot,
} from "./testUtil/hyvaksymisPaatosVaihe";
import {
  addLogoFilesToProjekti,
  defaultMocks,
  expectJulkinenNotFound,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  removeTiedosto,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import { expect } from "chai";
import { cleanupHyvaksymisPaatosVaiheTimestamps } from "../../commonTestUtil/cleanUpFunctions";
import { assertIsDefined } from "../../src/util/assertions";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";
import { Aineisto } from "../../src/database/model";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Jatkopäätökset", () => {
  const userFixture = new UserFixture(userService);

  const { eventSqsClientMock, awsCloudfrontInvalidationStub, schedulerMock } = defaultMocks();
  before(async () => {
    mockSaveProjektiToVelho();
    await deleteProjekti(oid);
    awsCloudfrontInvalidationStub.reset();

    await useProjektiTestFixture(FixtureName.JATKOPAATOS_1_ALKU);
    await addLogoFilesToProjekti(oid);
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  async function addJatkopaatos1WithAineistot(kuulutusPaiva: string) {
    // Lisää aineistot
    const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(oid);
    assertIsDefined(UserFixture.mattiMeikalainen.uid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos1Vaihe",
      velhoToimeksiannot,
      UserFixture.mattiMeikalainen.uid,
      Status.JATKOPAATOS_1,
      kuulutusPaiva,
      "2027"
    );
    await eventSqsClientMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös1 created", "jatkopaatos1");
  }

  async function addJatkopaatos2WithAineistot(kuulutusPaiva: string) {
    // Lisää aineistot
    const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(oid);
    assertIsDefined(UserFixture.mattiMeikalainen.uid);
    const projekti = await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos2Vaihe",
      velhoToimeksiannot,
      UserFixture.mattiMeikalainen.uid,
      Status.JATKOPAATOS_2,
      kuulutusPaiva,
      "2028"
    );
    await eventSqsClientMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös2 created", "jatkopaatos2");
    return projekti;
  }

  it("should go through jatkopäätös1, epäaktiivinen, jatkopäätös2, and epäaktiivinen states successfully", async () => {
    userFixture.loginAs(UserFixture.projari112);
    asetaAika("2025-01-02");
    const projekti = await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1_AINEISTOT);
    const projektiPaallikko = findProjektiPaallikko(projekti);

    await addJatkopaatos1WithAineistot("2025-01-02");
    await testJatkoPaatos1VaiheApproval(oid, projektiPaallikko, userFixture);
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(0);

    // Move hyvaksymisPaatosVaiheJulkaisu at least months into the past
    asetaAika("2026-01-02");
    await testEpaAktiivinenAfterJatkoPaatos1(oid, projektiPaallikko, userFixture);

    userFixture.loginAsAdmin();
    await addJatkopaatos2KasittelynTila("2026-01-02");
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await addJatkopaatos2WithAineistot("2026-01-02");
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(0); // Jatkopäätös1:n aineistojen poisto
    await testJatkoPaatos2VaiheApproval(oid, projektiPaallikko, userFixture);
    await eventSqsClientMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(0);

    // Move jatkopaatos at least months into the past
    asetaAika("2027-01-02");
    await testEpaAktiivinenAfterJatkoPaatos2(oid, projektiPaallikko, userFixture);
  });

  it("suorita jatkopäätösvaihe1 saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.JATKOPAATOS_1);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const jatkoPaatos1Vaihe = p.jatkoPaatos1Vaihe;
    assertIsDefined(jatkoPaatos1Vaihe);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    const hyvaksymisPaatosVanha = dbProjekti.jatkoPaatos1Vaihe?.hyvaksymisPaatos;
    const aineistotNahtavillaVanha = dbProjekti.jatkoPaatos1Vaihe?.aineistoNahtavilla;

    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      jatkoPaatos1Vaihe: {
        ...jatkoPaatos1Vaihe,
        aineistoNahtavilla: aineistotNahtavillaVanha
          ? aineistotNahtavillaVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : [],
        hyvaksymisPaatos: (hyvaksymisPaatosVanha
          ? hyvaksymisPaatosVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : []
        ).concat([
          {
            kategoriaId: "FOO",
            nimi: "foo.pdf",
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            tila: AineistoTila.ODOTTAA_TUONTIA,
            uuid: "jotain",
          },
        ]),
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    await eventSqsClientMock.processQueue();
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "JatkoPaatos1Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.jatkoPaatos1Vaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(oid, "JatkoPaatos1Vaihe saamenkielisellä kuulutuksella ja ilmoituksella", ProjektiPaths.PATH_JATKOPAATOS1);

    //
    // Hyväksyntä
    //
    asetaAika("2040-01-02");
    await doTestApproveAndPublishHyvaksymisPaatos(
      TilasiirtymaTyyppi.JATKOPAATOS_1,
      ProjektiPaths.PATH_JATKOPAATOS1,
      "jatkoPaatos1Vaihe",
      "jatkoPaatos1VaiheJulkaisu",
      oid,
      userFixture,
      eventSqsClientMock
    );
    await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1);
    //
    // Uudelleenkuulutus
    //
    const projektiPaallikko = findProjektiPaallikko(p);
    asetaAika("2040-06-02");
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.JATKOPAATOS_1,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2040-06-02"
    );
    await eventSqsClientMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(
      oid,
      "jatkoPaatos1VaiheJulkaisu",
      ProjektiPaths.PATH_JATKOPAATOS1,
      "jatkoPaatos1Vaihe"
    );
    p = await api.lataaProjekti(oid);
    expect(p.jatkoPaatos1VaiheJulkaisu?.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva).to.equal("2040-01-02T00:00:01+02:00");
  });

  it("suorita jatkopäätösvaihe2 saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.JATKOPAATOS_2);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const jatkoPaatos2Vaihe = p.jatkoPaatos2Vaihe;
    assertIsDefined(jatkoPaatos2Vaihe);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    const hyvaksymisPaatosVanha = dbProjekti.jatkoPaatos2Vaihe?.hyvaksymisPaatos;
    const aineistotNahtavillaVanha = dbProjekti.jatkoPaatos2Vaihe?.aineistoNahtavilla;
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      jatkoPaatos2Vaihe: {
        ...jatkoPaatos2Vaihe,
        aineistoNahtavilla: aineistotNahtavillaVanha
          ? aineistotNahtavillaVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : [],
        hyvaksymisPaatos: (hyvaksymisPaatosVanha
          ? hyvaksymisPaatosVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : []
        ).concat([
          {
            kategoriaId: "FOO",
            nimi: "foo.pdf",
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            uuid: "jotain",
            tila: AineistoTila.ODOTTAA_TUONTIA,
          },
        ]),
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    await eventSqsClientMock.processQueue();
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "jatkoPaatos2Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.jatkoPaatos2Vaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(oid, "jatkoPaatos2Vaihe saamenkielisellä kuulutuksella ja ilmoituksella", ProjektiPaths.PATH_JATKOPAATOS2);

    //
    // Hyväksyntä
    //
    asetaAika("2040-01-02");
    await doTestApproveAndPublishHyvaksymisPaatos(
      TilasiirtymaTyyppi.JATKOPAATOS_2,
      ProjektiPaths.PATH_JATKOPAATOS2,
      "jatkoPaatos2Vaihe",
      "jatkoPaatos2VaiheJulkaisu",
      oid,
      userFixture,
      eventSqsClientMock
    );

    //
    // Uudelleenkuulutus
    //
    const projektiPaallikko = findProjektiPaallikko(p);
    asetaAika("2040-06-01");
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.JATKOPAATOS_2,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2040-06-01"
    );
    await eventSqsClientMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(
      oid,
      "jatkoPaatos2VaiheJulkaisu",
      ProjektiPaths.PATH_JATKOPAATOS2,
      "jatkoPaatos2Vaihe"
    );
    p = await api.lataaProjekti(oid);
    expect(p.jatkoPaatos2VaiheJulkaisu?.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva).to.equal("2040-01-02T00:00:01+02:00");
  });
});

export async function testJatkoPaatos1VaiheApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  const expectedStatus = Status.JATKOPAATOS_1;
  const tilasiirtymaTyyppi = TilasiirtymaTyyppi.JATKOPAATOS_1;

  await api.siirraTila({
    oid,
    tyyppi: tilasiirtymaTyyppi,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, expectedStatus);
  expect(projektiHyvaksyttavaksi.jatkoPaatos1VaiheJulkaisu).to.not.be.undefined;
  expect(projektiHyvaksyttavaksi.jatkoPaatos1VaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({
    oid,
    tyyppi: tilasiirtymaTyyppi,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  const projekti = await loadProjektiFromDatabase(oid, expectedStatus);
  expectToMatchSnapshot("testJatkoPaatos1VaiheAfterApproval", {
    jatkoPaatos1Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1Vaihe),
    jatkoPaatos1VaiheJulkaisut: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1VaiheJulkaisu),
  });

  await testPublicAccessToProjekti(
    oid,
    expectedStatus,
    userFixture,
    "JatkoPaatos1VaiheJulkinenAfterApproval",
    (projektiJulkinen) => (projektiJulkinen.jatkoPaatos1Vaihe = cleanupHyvaksymisPaatosVaiheTimestamps(projektiJulkinen.jatkoPaatos1Vaihe))
  );
}

export async function testJatkoPaatos2VaiheApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  const expectedStatus = Status.JATKOPAATOS_2;
  const tilasiirtymaTyyppi = TilasiirtymaTyyppi.JATKOPAATOS_2;

  await api.siirraTila({
    oid,
    tyyppi: tilasiirtymaTyyppi,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, expectedStatus);
  expect(projektiHyvaksyttavaksi.jatkoPaatos2VaiheJulkaisu).to.not.be.undefined;
  expect(projektiHyvaksyttavaksi.jatkoPaatos2VaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({
    oid,
    tyyppi: tilasiirtymaTyyppi,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  const projekti = await loadProjektiFromDatabase(oid, expectedStatus);
  expectToMatchSnapshot("testJatkoPaatos2VaiheAfterApproval", {
    jatkoPaatos2Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1Vaihe),
    jatkoPaatos2VaiheJulkaisut: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos2VaiheJulkaisu),
  });

  await testPublicAccessToProjekti(
    oid,
    expectedStatus,
    userFixture,
    "JatkoPaatos2VaiheJulkinenAfterApproval",
    (projektiJulkinen) => (projektiJulkinen.jatkoPaatos2Vaihe = cleanupHyvaksymisPaatosVaiheTimestamps(projektiJulkinen.jatkoPaatos2Vaihe))
  );
}

export async function testEpaAktiivinenAfterJatkoPaatos1(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_2);
  await expectJulkinenNotFound(oid, userFixture);
}

export async function testEpaAktiivinenAfterJatkoPaatos2(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_3);
  await expectJulkinenNotFound(oid, userFixture);
}

async function addJatkopaatos2KasittelynTila(toinenJatkoPaatosPvm: string) {
  const versio = (await api.lataaProjekti(oid)).versio;
  const projekti = {
    oid,
    versio,
    kasittelynTila: {
      toinenJatkopaatos: { paatoksenPvm: toinenJatkoPaatosPvm, asianumero: "jatkopaatos2_asianumero" },
    },
  };
  await api.tallennaProjekti(projekti);
}
