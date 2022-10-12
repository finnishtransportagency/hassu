import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import { Status } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { getCloudFront } from "../../src/aws/client";
import { cleanProjektiS3Files } from "../util/s3Util";
import { emailClient } from "../../src/email/email";
import {
  deleteProjekti,
  julkaiseSuunnitteluvaihe,
  julkaiseVuorovaikutus,
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
  testUpdatePublishDateAndDeleteAineisto,
  verifyCloudfrontWasInvalidated,
  verifyEmailsSent,
  verifyVuorovaikutusSnapshot,
} from "./testUtil/tests";
import { takePublicS3Snapshot, takeS3Snapshot, takeYllapitoS3Snapshot } from "./testUtil/util";
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
import { pdfGeneratorClient } from "../../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../../src/asiakirja/lambda/pdfGeneratorHandler";
import { awsMockResolves } from "../../test/aws/awsMock";
import { ImportAineistoMock } from "./testUtil/importAineistoMock";

const { expect } = require("chai");

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let userFixture: UserFixture;
  let awsCloudfrontInvalidationStub: sinon.SinonStub;
  let emailClientStub: sinon.SinonStub;

  const importAineistoMock = new ImportAineistoMock();

  before(async () => {
    await setupLocalDatabase();
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sinon.stub(openSearchClientYllapito, "query").resolves({ status: 200 });
    sinon.stub(openSearchClientYllapito, "deleteDocument");
    sinon.stub(openSearchClientYllapito, "putDocument");

    importAineistoMock.initStub();
    const pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    pdfGeneratorLambdaStub.callsFake(async (event) => {
      return await pdfGenerator(event);
    });

    awsCloudfrontInvalidationStub = sinon.stub(getCloudFront(), "createInvalidation");
    awsMockResolves(awsCloudfrontInvalidationStub, {});

    emailClientStub = sinon.stub(emailClient, "sendEmail");

    try {
      await deleteProjekti(oid);
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
    verifyEmailsSent(emailClientStub);

    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid);
    await testImportAineistot(oid, velhoAineistoKategorias);
    await importAineistoMock.processQueue();
    await verifyVuorovaikutusSnapshot(oid, userFixture);

    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid);
    verifyEmailsSent(emailClientStub);
    await importAineistoMock.processQueue();
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
    await recordProjektiTestFixture(FixtureName.NAHTAVILLAOLO, oid);

    await julkaiseVuorovaikutus(oid, userFixture);
    await importAineistoMock.processQueue();
    verifyEmailsSent(emailClientStub);
    await takeS3Snapshot(oid, "just after vuorovaikutus published");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await testUpdatePublishDateAndDeleteAineisto(oid, userFixture);
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "vuorovaikutus publish date changed and last aineisto deleted");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await sendEmailDigests();
    verifyEmailsSent(emailClientStub);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    const nahtavillaoloVaihe = await testImportNahtavillaoloAineistot(oid, velhoAineistoKategorias);
    await importAineistoMock.processQueue();
    await testNahtavillaoloLisaAineisto(oid, nahtavillaoloVaihe.lisaAineistoParametrit!);
    await testNahtavillaoloApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nahtavillaolo published");
    verifyEmailsSent(emailClientStub);

    await testHyvaksymismenettelyssa(oid, userFixture);
    await testHyvaksymisPaatosVaihe(oid, userFixture);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoAineistoKategorias,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY
    );
    await importAineistoMock.processQueue();
    await takeYllapitoS3Snapshot(oid, "Hyvaksymispaatos created", "hyvaksymispaatos");

    await testHyvaksymisPaatosVaiheApproval(oid, projektiPaallikko, userFixture);
    await importAineistoMock.processQueue();
    await takePublicS3Snapshot(oid, "Hyvaksymispaatos approved", "hyvaksymispaatos");
    verifyEmailsSent(emailClientStub);

    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED, oid);
  });
});
