import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import { Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanProjektiS3Files } from "../util/s3Util";
import {
  deleteProjekti,
  julkaiseSuunnitteluvaihe,
  loadProjektiFromDatabase,
  readProjektiFromVelho,
  sendEmailDigests,
  testAloituskuulutusApproval,
  testAloitusKuulutusEsikatselu,
  testImportAineistot,
  testListDocumentsToImport,
  testNullifyProjektiField,
  testProjektiHenkilot,
  testProjektinTiedot,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
  verifyVuorovaikutusSnapshot,
} from "./testUtil/tests";
import {
  CloudFrontStub,
  EmailClientStub,
  mockSaveProjektiToVelho,
  PDFGeneratorStub,
  SchedulerMock,
  takePublicS3Snapshot,
  takeS3Snapshot,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import {
  testImportNahtavillaoloAineistot,
  testNahtavillaolo,
  testNahtavillaoloApproval,
  testNahtavillaoloLisaAineisto,
} from "./testUtil/nahtavillaolo";
import {
  testCreateHyvaksymisPaatosWithAineistot,
  testHyvaksymismenettelyssa,
  testHyvaksymisPaatosVaihe,
  testHyvaksymisPaatosVaiheApproval,
} from "./testUtil/hyvaksymisPaatosVaihe";
import { FixtureName, recordProjektiTestFixture } from "./testFixtureRecorder";
import { ImportAineistoMock } from "./testUtil/importAineistoMock";
import { api } from "./apiClient";
import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";

const { expect } = require("chai");

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let userFixture: UserFixture;
  let awsCloudfrontInvalidationStub: CloudFrontStub;
  const emailClientStub = new EmailClientStub();
  const pdfGeneratorStub = new PDFGeneratorStub();
  let importAineistoMock: ImportAineistoMock;
  let schedulerMock: SchedulerMock;

  before(async () => {
    await setupLocalDatabase();
    mockSaveProjektiToVelho();
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sinon.stub(openSearchClientYllapito, "query").resolves({ status: 200 });
    sinon.stub(openSearchClientYllapito, "deleteDocument");
    sinon.stub(openSearchClientYllapito, "putDocument");

    importAineistoMock = new ImportAineistoMock();
    awsCloudfrontInvalidationStub = new CloudFrontStub();
    pdfGeneratorStub.init();
    emailClientStub.init();
    schedulerMock = new SchedulerMock();

    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const projekti = await readProjektiFromVelho();
    expect(oid).to.eq(projekti.oid);
    await cleanProjektiS3Files(oid);
    const projektiPaallikko = await testProjektiHenkilot(projekti, oid, userFixture);
    await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(oid);
    await testNullifyProjektiField(oid);
    await testAloituskuulutusApproval(oid, projektiPaallikko, userFixture);
    emailClientStub.verifyEmailsSent();
    await recordProjektiTestFixture(FixtureName.ALOITUSKUULUTUS, oid);

    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko.kayttajatunnus);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid); // testaa sitä kun käyttäjä avaa aineistodialogin ja valkkaa sieltä tiedostoja
    await testImportAineistot(oid, velhoAineistoKategorias); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    await importAineistoMock.processQueue();
    await verifyVuorovaikutusSnapshot(oid, userFixture);

    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid, userFixture);
    emailClientStub.verifyEmailsSent();
    await importAineistoMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
    await recordProjektiTestFixture(FixtureName.NAHTAVILLAOLO, oid);
    // TODO: test päivitä suunnitteluvaiheen perustietoja
    // TODO: test päivitä vuorovaikutustilaisuuksia
    await importAineistoMock.processQueue();
    emailClientStub.verifyEmailsSent();
    await takeS3Snapshot(oid, "just after vuorovaikutus published");
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();

    await sendEmailDigests();
    emailClientStub.verifyEmailsSent();

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    const nahtavillaoloVaihe = await testImportNahtavillaoloAineistot(oid, velhoAineistoKategorias);
    await importAineistoMock.processQueue();
    await testNahtavillaoloLisaAineisto(oid, nahtavillaoloVaihe.lisaAineistoParametrit!);
    await testNahtavillaoloApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nahtavillaolo published");
    emailClientStub.verifyEmailsSent();

    await testHyvaksymismenettelyssa(oid, userFixture);
    await testHyvaksymisPaatosVaihe(oid, userFixture);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoAineistoKategorias,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY
    );

    // Yritä lähettää hyväksyttäväksi ennen kuin aineistot on tuotu (eli tässä importAineistoMock.processQueue() kutsuttu)
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await expect(
      api.siirraTila({
        oid,
        tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
        toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      })
    ).to.eventually.be.rejectedWith(IllegalArgumentError);

    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "Hyvaksymispaatos created", "hyvaksymispaatos");

    await testHyvaksymisPaatosVaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    await takePublicS3Snapshot(oid, "Hyvaksymispaatos approved", "hyvaksymispaatos");
    emailClientStub.verifyEmailsSent();

    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED, oid);
    await schedulerMock.verifyAndRunSchedule();
  });
});
