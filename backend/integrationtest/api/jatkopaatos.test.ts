/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, MOCKED_TIMESTAMP, useProjektiTestFixture } from "./testFixtureRecorder";
import { setupLocalDatabase } from "../util/databaseUtil";
import { deleteProjekti, loadProjektiFromDatabase, testPublicAccessToProjekti } from "./testUtil/tests";
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
import { ImportAineistoMock } from "./testUtil/importAineistoMock";
import {
  CloudFrontStub,
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

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Jatkopäätökset", () => {
  let userFixture: UserFixture;

  let awsCloudfrontInvalidationStub: CloudFrontStub;
  let importAineistoMock: ImportAineistoMock;

  before(async () => {
    userFixture = new UserFixture(userService);
    importAineistoMock = new ImportAineistoMock();
    awsCloudfrontInvalidationStub = new CloudFrontStub();

    const pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    pdfGeneratorLambdaStub.callsFake(async (event) => {
      return await pdfGenerator(event);
    });

    await setupLocalDatabase();
    mockSaveProjektiToVelho();
    await deleteProjekti(oid);
    awsCloudfrontInvalidationStub.reset();

    await useProjektiTestFixture(FixtureName.JATKOPAATOS_1_ALKU);
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  async function addJatkopaatos1WithAineistot() {
    // Lisää aineistot
    const velhoAineistoKategorias = await api.listaaVelhoProjektiAineistot(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos1Vaihe",
      velhoAineistoKategorias,
      UserFixture.mattiMeikalainen.uid!,
      Status.JATKOPAATOS_1
    );
    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös1 created", "jatkopaatos1");
  }

  async function addJatkopaatos2WithAineistot() {
    // Lisää aineistot
    const velhoAineistoKategorias = await api.listaaVelhoProjektiAineistot(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "jatkoPaatos2Vaihe",
      velhoAineistoKategorias,
      UserFixture.mattiMeikalainen.uid!,
      Status.JATKOPAATOS_2
    );
    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "jatkopäätös2 created", "jatkopaatos2");
  }

  it("should go through jatkopäätös1, epäaktiivinen, jatkopäätös2, and epäaktiivinen states successfully", async () => {
    userFixture.loginAs(UserFixture.projari112);
    let projekti = await loadProjektiFromDatabase(oid, Status.JATKOPAATOS_1);
    const projektiPaallikko = projekti.kayttoOikeudet?.filter((user) => user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO).pop()!;

    await addJatkopaatos1WithAineistot();
    await testJatkoPaatos1VaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(1);
    await testEpaAktiivinenAfterJatkoPaatos1(oid, projektiPaallikko, userFixture);

    userFixture.loginAsAdmin();
    await addJatkopaatos2KasittelynTila();
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await addJatkopaatos2WithAineistot();
    await testJatkoPaatos2VaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated(1);
    await testEpaAktiivinenAfterJatkoPaatos2(oid, projektiPaallikko, userFixture);
  });
});

export async function testJatkoPaatos1VaiheApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  let expectedStatus = Status.JATKOPAATOS_1;
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
    jatkoPaatos1Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1Vaihe!),
    jatkoPaatos1VaiheJulkaisut: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1VaiheJulkaisu!),
  });

  await testPublicAccessToProjekti(
    oid,
    expectedStatus,
    userFixture,
    "JatkoPaatos1VaiheJulkinenAfterApproval",
    (projektiJulkinen) =>
      (projektiJulkinen.jatkoPaatos1Vaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(projektiJulkinen.jatkoPaatos1Vaihe!))
  );
}

export async function testJatkoPaatos2VaiheApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  let expectedStatus = Status.JATKOPAATOS_2;
  let tilasiirtymaTyyppi = TilasiirtymaTyyppi.JATKOPAATOS_2;

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
    jatkoPaatos2Vaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos1Vaihe!),
    jatkoPaatos2VaiheJulkaisut: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.jatkoPaatos2VaiheJulkaisu!),
  });

  await testPublicAccessToProjekti(
    oid,
    expectedStatus,
    userFixture,
    "JatkoPaatos2VaiheJulkinenAfterApproval",
    (projektiJulkinen) =>
      (projektiJulkinen.jatkoPaatos2Vaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(projektiJulkinen.jatkoPaatos2Vaihe!))
  );
}

export async function testEpaAktiivinenAfterJatkoPaatos1(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  // Move hyvaksymisPaatosVaiheJulkaisu at least months into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti!.jatkoPaatos1VaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
  await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(dbProjekti!, julkaisu);

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
  const julkaisu = dbProjekti!.jatkoPaatos2VaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-01-01";
  await projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(dbProjekti!, julkaisu);

  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await loadProjektiFromDatabase(oid, Status.EPAAKTIIVINEN_3);
  await expectJulkinenNotFound(oid, userFixture);
}

async function addJatkopaatos2KasittelynTila() {
  const projekti = {
    oid,
    kasittelynTila: {
      toinenJatkopaatos: { paatoksenPvm: MOCKED_TIMESTAMP, asianumero: "jatkopaatos2_asianumero" },
    },
  };
  await api.tallennaProjekti(projekti);
}
