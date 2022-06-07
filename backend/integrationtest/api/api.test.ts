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
} from "./testUtil/tests";
import { takeS3Snapshot } from "./testUtil/util";
const sandbox = sinon.createSandbox();

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let importAineistoStub: sinon.SinonStub;
  let userFixture: UserFixture;
  let oid: string = undefined;
  let awsCloudfrontInvalidationStub: sinon.SinonStub;
  let emailClientStub: sinon.SinonStub;

  after(() => {
    userFixture.logout();
    sandbox.restore();
    sinon.restore();
    AWSMock.restore();
  });

  before("Initialize test database!", async () => {
    await setupLocalDatabase();
  });

  const fakeAineistoImportQueue: SQSEvent[] = [];

  before(async () => {
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sandbox.stub(openSearchClientYllapito, "query").resolves({ status: 200 });
    sandbox.stub(openSearchClientYllapito, "deleteProjekti");
    sandbox.stub(openSearchClientYllapito, "putProjekti");

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

    emailClientStub = sinon.stub(emailClient, "sendEmail");
  });

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const projekti = await readProjektiFromVelho();
    oid = projekti.oid;
    await cleanProjektiS3Files(oid);
    const projektiPaallikko = await testProjektiHenkilot(projekti, oid);
    await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(oid);
    await testNullifyProjektiField(oid);
    await testAloituskuulutusApproval(oid, projektiPaallikko, userFixture);

    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid);
    await testImportAineistot(oid, velhoAineistoKategorias);
    await processQueue(fakeAineistoImportQueue, userFixture, oid);
    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid);
    await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await insertAndManageFeedback(oid);

    await julkaiseVuorovaikutus(oid, userFixture);
    await takeS3Snapshot(oid, "just after vuorovaikutus published");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await testUpdatePublishDateAndDeleteAineisto(oid, userFixture);
    await takeS3Snapshot(oid, "vuorovaikutus publish date changed and last aineisto deleted");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await sendEmailDigests();
    verifyEmailsSent(emailClientStub);
  });

  it.skip("should archive projekti", async function () {
    replaceAWSDynamoDBWithLocalstack();
    await archiveProjekti(oid);
  });
});
