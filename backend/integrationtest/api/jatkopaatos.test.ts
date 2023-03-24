/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { cleanupAnyProjektiData, FixtureName, MOCKED_TIMESTAMP, useProjektiTestFixture } from "./testFixtureRecorder";
import { deleteProjekti, loadProjektiFromDatabase, tallennaEULogo, testPublicAccessToProjekti } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import {
  KayttajaTyyppi,
  KuulutusJulkaisuTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../../common/graphql/apiModel";
import { api } from "./apiClient";
import { testCreateHyvaksymisPaatosWithAineistot } from "./testUtil/hyvaksymisPaatosVaihe";
import {
  addLogoFilesToProjekti,
  defaultMocks,
  expectJulkinenNotFound,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import { expect } from "chai";
import {
  cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps,
  cleanupHyvaksymisPaatosVaiheTimestamps,
} from "./testUtil/cleanUpFunctions";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { pdfGeneratorClient } from "../../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../../src/asiakirja/lambda/pdfGeneratorHandler";
import { assertIsDefined } from "../../src/util/assertions";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Jatkopäätökset", () => {
  const userFixture = new UserFixture(userService);

  const { importAineistoMock, awsCloudfrontInvalidationStub } = defaultMocks();
  before(async () => {
    const pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    pdfGeneratorLambdaStub.callsFake(async (event) => {
      return await pdfGenerator(event);
    });

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

  async function addJatkopaatos1WithAineistot() {
    // Lisää aineistot
    const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos1Vaihe",
      velhoToimeksiannot,
      UserFixture.mattiMeikalainen.uid!,
      Status.JATKOPAATOS_1
    );
    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös1 created", "jatkopaatos1");
  }

  async function addJatkopaatos2WithAineistot() {
    // Lisää aineistot
    const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos2Vaihe",
      velhoToimeksiannot,
      UserFixture.mattiMeikalainen.uid!,
      Status.JATKOPAATOS_2
    );
    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös2 created", "jatkopaatos2");
  }

  it("should go through jatkopäätös1, epäaktiivinen, jatkopäätös2, and epäaktiivinen states successfully", async () => {
    userFixture.loginAs(UserFixture.projari112);
    const projekti = await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1_AINEISTOT);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((user) => user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
    assertIsDefined(projektiPaallikko);

    await addJatkopaatos1WithAineistot();
    await testJatkoPaatos1VaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(3);
    await testEpaAktiivinenAfterJatkoPaatos1(oid, projektiPaallikko, userFixture);

    userFixture.loginAsAdmin();
    await addJatkopaatos2KasittelynTila();
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await addJatkopaatos2WithAineistot();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(1); // Jatkopäätös1:n aineistojen poisto
    await testJatkoPaatos2VaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(1);
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
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      jatkoPaatos1Vaihe: {
        ...jatkoPaatos1Vaihe,
        aineistoNahtavilla: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
        hyvaksymisPaatos: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "JatkoPaatos1Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.jatkoPaatos1Vaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "JatkoPaatos1Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_JATKOPAATOS1
    );
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
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      jatkoPaatos2Vaihe: {
        ...jatkoPaatos2Vaihe,
        aineistoNahtavilla: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
        hyvaksymisPaatos: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "jatkoPaatos2Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.jatkoPaatos2Vaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "jatkoPaatos2Vaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_JATKOPAATOS2
    );
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
    (projektiJulkinen) =>
      (projektiJulkinen.jatkoPaatos1Vaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(projektiJulkinen.jatkoPaatos1Vaihe))
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
    (projektiJulkinen) =>
      (projektiJulkinen.jatkoPaatos2Vaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(projektiJulkinen.jatkoPaatos2Vaihe))
  );
}

export async function testEpaAktiivinenAfterJatkoPaatos1(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  // Move hyvaksymisPaatosVaiheJulkaisu at least months into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  const julkaisu = dbProjekti.jatkoPaatos1VaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
  await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(dbProjekti, julkaisu);

  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_2);
  await expectJulkinenNotFound(oid, userFixture);
}

export async function testEpaAktiivinenAfterJatkoPaatos2(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  // Move hyvaksymisPaatosVaiheJulkaisu at least months into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  const julkaisu = dbProjekti.jatkoPaatos2VaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
  await projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(dbProjekti, julkaisu);

  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_3);
  await expectJulkinenNotFound(oid, userFixture);
}

async function addJatkopaatos2KasittelynTila() {
  const versio = (await api.lataaProjekti(oid)).versio;
  const projekti = {
    oid,
    versio,
    kasittelynTila: {
      toinenJatkopaatos: { paatoksenPvm: MOCKED_TIMESTAMP, asianumero: "jatkopaatos2_asianumero" },
    },
  };
  await api.tallennaProjekti(projekti);
}
