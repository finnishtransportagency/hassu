import { describe, it } from "mocha";
import { api } from "./apiClient";
import { replaceAWSDynamoDBWithLocalstack, setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import { Status } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import Sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { fail } from "assert";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { aineistoImporterClient } from "../../src/aineisto/aineistoImporterClient";
import { handleEvent } from "../../src/aineisto/aineistoImporterLambda";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import { fileService } from "../../src/files/fileService";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { getCloudFront, produce } from "../../src/aws/client";
import { cleanProjektiS3Files } from "../util/s3Util";
import { emailClient } from "../../src/email/email";
import { palauteEmailService } from "../../src/palaute/palauteEmailService";
import {
  archiveProjekti,
  insertAndManageFeedback,
  julkaiseSuunnitteluvaihe,
  julkaiseVuorovaikutus,
  loadProjektiFromDatabase,
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
} from "./testUtil/tests";
import { cleanupVuorovaikutusTimestamps } from "./testUtil/cleanUpFunctions";
const { expect } = require("chai");
const sandbox = sinon.createSandbox();

function cleanupGeneratedIds(obj: unknown) {
  return Object.keys(obj).reduce((cleanObj, key) => {
    const cleanedUpKey = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key];
    return cleanObj;
  }, {});
}

function verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub: Sinon.SinonStub) {
  expect(awsCloudfrontInvalidationStub.getCalls()).to.have.length(1);
  expect(awsCloudfrontInvalidationStub.getCalls()[0].args).to.have.length(2);
  const invalidationParams = awsCloudfrontInvalidationStub.getCalls()[0].args[0];
  invalidationParams.InvalidationBatch.CallerReference = "***unittest***";
  expect(invalidationParams).toMatchSnapshot();
  awsCloudfrontInvalidationStub.resetHistory();
}

async function takeS3Snapshot(oid: string, description: string) {
  expect({
    ["yllapito S3 files " + description]: cleanupGeneratedIds(await fileService.listYllapitoProjektiFiles(oid, "")),
  }).toMatchSnapshot(description);
  expect({
    ["public S3 files " + description]: cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, "", true)),
  }).toMatchSnapshot(description);
}

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
    await processQueue();
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
    verifyEmailsSent();
  });

  async function processQueue() {
    expect(fakeAineistoImportQueue).toMatchSnapshot();
    for (const event of fakeAineistoImportQueue) {
      await handleEvent(event, null, null);
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const suunnitteluVaihe = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe;
    const vuorovaikutus = suunnitteluVaihe.vuorovaikutukset[0];
    cleanupVuorovaikutusTimestamps([vuorovaikutus]);
    expect(vuorovaikutus).toMatchSnapshot();
  }

  it.skip("should archive projekti", async function () {
    replaceAWSDynamoDBWithLocalstack();
    await archiveProjekti(oid);
  });

  async function readProjektiFromVelho() {
    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info({ projekti });
    return projekti;
  }

  async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
    const searchResult = await api.getVelhoSuunnitelmasByName("HASSU AUTOMAATTITESTIPROJEKTI1");
    // tslint:disable-next-line:no-unused-expression
    expect(searchResult).not.to.be.empty;

    const oid = searchResult.pop()?.oid;
    if (!oid) {
      fail("No suitable projekti found from Velho");
    }
    return oid;
  }

  async function sendEmailDigests() {
    await palauteEmailService.sendNewFeedbackDigest();
  }

  function verifyEmailsSent() {
    expect(
      emailClientStub.getCalls().map((call) => {
        const arg = call.args[0];
        if (arg.attachments) {
          arg.attachments = arg.attachments.map((attachment) => {
            attachment.content = "***unittest***";
            return attachment;
          });
        }
        return {
          emailOptions: arg,
        };
      })
    ).toMatchSnapshot();
  }
});
