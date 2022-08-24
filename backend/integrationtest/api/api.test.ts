import { describe, it } from "mocha";
import { replaceAWSDynamoDBWithLocalstack, setupLocalDatabase } from "../util/databaseUtil";
import { Status } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { aineistoImporterClient } from "../../src/aineisto/aineistoImporterClient";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { getCloudFront, produce } from "../../src/aws/client";
import { cleanProjektiS3Files } from "../util/s3Util";
import { emailClient } from "../../src/email/email";
import {
  archiveProjekti,
  insertAndManageFeedback,
  julkaiseSuunnitteluvaihe,
  julkaiseVuorovaikutus,
  loadProjektiFromDatabase,
  processQueue,
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
  testHyvaksymisPaatosVaiheApproval,
  testHyvaksymisPaatosVaiheHyvaksymismenettelyssa,
  testImportHyvaksymisPaatosAineistot,
} from "./testUtil/hyvaksymisPaatosVaihe";

const sandbox = sinon.createSandbox();
const { expect } = require("chai");

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let importAineistoStub: sinon.SinonStub;
  let userFixture: UserFixture;
  let awsCloudfrontInvalidationStub: sinon.SinonStub;
  let emailClientStub: sinon.SinonStub;

  after(() => {
    userFixture.logout();
    sandbox.restore();
    sandbox.reset();
    sinon.restore();
    sinon.reset();
    AWSMock.restore();
  });

  const fakeAineistoImportQueue: SQSEvent[] = [];

  before(async () => {
    await setupLocalDatabase();
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sandbox.stub(openSearchClientYllapito, "query").resolves({ status: 200 });
    sandbox.stub(openSearchClientYllapito, "deleteDocument");
    sandbox.stub(openSearchClientYllapito, "putDocument");

    importAineistoStub = sandbox.stub(aineistoImporterClient, "importAineisto");
    importAineistoStub.callsFake(async (event) => {
      fakeAineistoImportQueue.push({ Records: [{ body: JSON.stringify(event) } as SQSRecord] });
    });

    awsCloudfrontInvalidationStub = sandbox.stub();
    awsCloudfrontInvalidationStub.resolves({});
    AWSMock.setSDKInstance(AWS);
    produce<AWS.CloudFront>("cloudfront", () => undefined, true);
    AWSMock.mock("CloudFront", "createInvalidation", awsCloudfrontInvalidationStub);
    getCloudFront();

    emailClientStub = sandbox.stub(emailClient, "sendEmail");

    try {
      await archiveProjekti(oid);
    } catch (ignored) {
      // ignored
    }
  });

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const projekti = await readProjektiFromVelho();
    expect(oid).to.eq(projekti.oid);
    await cleanProjektiS3Files(oid);
    const projektiPaallikko = await testProjektiHenkilot(projekti, oid);
    await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(oid);
    await testNullifyProjektiField(oid);
    await testAloituskuulutusApproval(oid, projektiPaallikko, userFixture);
    verifyEmailsSent(emailClientStub);

    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid);
    await testImportAineistot(oid, velhoAineistoKategorias);
    await processQueue(fakeAineistoImportQueue);
    await verifyVuorovaikutusSnapshot(oid, userFixture);

    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid);
    verifyEmailsSent(emailClientStub);
    await processQueue(fakeAineistoImportQueue);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
    await insertAndManageFeedback(oid);

    await julkaiseVuorovaikutus(oid, userFixture);
    await processQueue(fakeAineistoImportQueue);
    verifyEmailsSent(emailClientStub);
    await takeS3Snapshot(oid, "just after vuorovaikutus published");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await testUpdatePublishDateAndDeleteAineisto(oid, userFixture);
    await processQueue(fakeAineistoImportQueue);
    await takeS3Snapshot(oid, "vuorovaikutus publish date changed and last aineisto deleted");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await sendEmailDigests();
    verifyEmailsSent(emailClientStub);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    const nahtavillaoloVaihe = await testImportNahtavillaoloAineistot(oid, velhoAineistoKategorias);
    await processQueue(fakeAineistoImportQueue);
    await testNahtavillaoloLisaAineisto(oid, nahtavillaoloVaihe.lisaAineistoParametrit);
    await testNahtavillaoloApproval(oid, projektiPaallikko, userFixture);
    await processQueue(fakeAineistoImportQueue);
    await takeS3Snapshot(oid, "Nahtavillaolo published");
    verifyEmailsSent(emailClientStub);

    await testHyvaksymisPaatosVaiheHyvaksymismenettelyssa(oid, userFixture);
    await testImportHyvaksymisPaatosAineistot(oid, velhoAineistoKategorias, projektiPaallikko.kayttajatunnus);
    await processQueue(fakeAineistoImportQueue);
    await takeYllapitoS3Snapshot(oid, "Hyvaksymispaatos created", "hyvaksymispaatos");

    await testHyvaksymisPaatosVaiheApproval(oid, projektiPaallikko, userFixture);
    await processQueue(fakeAineistoImportQueue);
    await takePublicS3Snapshot(oid, "Hyvaksymispaatos approved", "hyvaksymispaatos");
    verifyEmailsSent(emailClientStub);
  });

  it.skip("should archive projekti", async function () {
    replaceAWSDynamoDBWithLocalstack();
    await archiveProjekti(oid);
  });
});
