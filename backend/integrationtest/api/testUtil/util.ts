import { cleanupGeneratedIds } from "./cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
import { AineistoInput, IlmoitettavaViranomainen, Kieli, KirjaamoOsoite, VelhoAineisto } from "../../../../common/graphql/apiModel";
import { loadProjektiJulkinenFromDatabase } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import * as sinon from "sinon";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../../../src/asiakirja/lambda/pdfGeneratorHandler";
import { emailClient } from "../../../src/email/email";
import { Attachment } from "nodemailer/lib/mailer";
import { EnhancedPDF } from "../../../src/asiakirja/asiakirjaTypes";
import { GeneratePDFEvent } from "../../../src/asiakirja/lambda/generatePDFEvent";
import { velho } from "../../../src/velho/velhoClient";
import mocha from "mocha";
import { NotFoundError } from "../../../src/error/NotFoundError";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { getCloudFront } from "../../../src/aws/clients/getCloudFront";
import { getScheduler } from "../../../src/aws/clients/getScheduler";
import { awsMockResolves, expectAwsCalls } from "../../../test/aws/awsMock";
import { CreateScheduleInput } from "aws-sdk/clients/scheduler";
import { handleEvent } from "../../../src/aineisto/aineistoImporterLambda";
import { Callback, Context } from "aws-lambda";
import { SQSRecord } from "aws-lambda/trigger/sqs";
import assert from "assert";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { kirjaamoOsoitteetService } from "../../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import {
  openSearchClientIlmoitustauluSyote,
  openSearchClientJulkinen,
  openSearchClientYllapito,
} from "../../../src/projektiSearch/openSearchClient";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { ProjektiAineistoManager } from "../../../src/aineisto/projektiAineistoManager";
import { assertIsDefined } from "../../../src/util/assertions";
import { lyhytOsoiteDatabase } from "../../../src/database/lyhytOsoiteDatabase";
import crypto from "crypto";
import { ImportAineistoMock } from "./importAineistoMock";
import { ProjektiPaths } from "../../../src/files/ProjektiPath";
import fs from "fs";
import { setupLocalDatabase } from "../../util/databaseUtil";

const { expect } = require("chai");

export async function takeS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  await takeYllapitoS3Snapshot(oid, description, path);
  await takePublicS3Snapshot(oid, description);
}

export async function takeYllapitoS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  const obj = await fileService.listYllapitoProjektiFiles(oid, path || "");
  expect({
    ["yllapito S3 files " + description]: cleanupAnyProjektiData(cleanupGeneratedIds(obj)),
  }).toMatchSnapshot(description);
}

export async function takePublicS3Snapshot(oid: string, description: string, path = ""): Promise<void> {
  expect({
    ["public S3 files " + description]: cleanupAnyProjektiData(
      cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, path, true))
    ),
  }).toMatchSnapshot(description);
}

export function expectToMatchSnapshot(description: string, obj: unknown): void {
  expect({ description, obj }).toMatchSnapshot();
}

export function adaptAineistoToInput(aineistot: VelhoAineisto[]): AineistoInput[] {
  return aineistot
    .map((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi } = aineisto;
      return { jarjestys: index + 1, nimi, dokumenttiOid };
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export function expectApiError(e: Error, message: string): void {
  let contents = {
    message: "",
  };
  try {
    contents = JSON.parse(e.message);
  } catch (error) {
    contents = {
      message: e.message,
    };
    console.log(error);
  }
  expect(contents.message).to.eq(message);
}

export async function expectJulkinenNotFound(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.logout();
  await expect(loadProjektiJulkinenFromDatabase(oid)).to.eventually.be.rejectedWith(NotFoundError);
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export class PDFGeneratorStub {
  private pdfGeneratorLambdaStub!: sinon.SinonStub<[GeneratePDFEvent], Promise<EnhancedPDF>>;
  private pdfs: Pick<EnhancedPDF, "nimi" | "textContent">[] = [];

  init(): void {
    this.pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    this.pdfGeneratorLambdaStub.callsFake(async (event) => {
      const pdf: EnhancedPDF = await pdfGenerator(event);
      this.pdfs.push({ nimi: pdf.nimi, textContent: pdf.textContent });
      return pdf;
    });
  }

  verifyAllPDFContents(): void {
    if (this.pdfs.length > 0) {
      expectToMatchSnapshot(
        "PDF:ien sisällöt",
        this.pdfs.sort((pdf1, pdf2) => pdf1.nimi.localeCompare(pdf2.nimi))
      );
    }
  }

  verifyPDFContents(fileName: string): void {
    if (this.pdfs.length > 0) {
      for (const pdf of this.pdfs) {
        if (pdf.nimi == fileName) {
          expectToMatchSnapshot("PDF:n sisältö", pdf);
        }
      }
    }
  }
}

export class EmailClientStub {
  private emailClientStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.emailClientStub = sinon.stub(emailClient, "sendEmail");
    });
    mocha.beforeEach(() => {
      this.emailClientStub.callsFake((options) => {
        return Promise.resolve({
          messageId: "messageId_test",
          accepted: (options.to || []) as string[],
          rejected: [],
          pending: [],
        } as unknown as SMTPTransport.SentMessageInfo);
      });
    });
  }

  verifyEmailsSent(): void {
    if (this.emailClientStub.getCalls().length > 0) {
      expect(
        this.emailClientStub
          .getCalls()
          .map((call) => {
            const arg = call.args[0];
            if (arg.attachments) {
              arg.attachments = arg.attachments.map((attachment: Attachment) => {
                // Remove unnecessary data from snapshot
                delete attachment.content;
                delete attachment.contentDisposition;
                return attachment;
              });
            }
            return arg;
          })
          .sort()
      ).toMatchSnapshot();
      this.emailClientStub.resetHistory();
    }
  }
}

export class CloudFrontStub {
  private stub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.stub = sinon.stub(getCloudFront(), "createInvalidation");
      awsMockResolves(this.stub, {});
    });
    mocha.beforeEach(() => {
      awsMockResolves(this.stub, {});
    });
  }

  verifyCloudfrontWasInvalidated(expectedNumberOfCalls?: number): void {
    expectAwsCalls(this.stub, "CallerReference");
    if (expectedNumberOfCalls) {
      expect(this.stub.getCalls()).to.have.length(expectedNumberOfCalls);
    }
    this.reset();
  }

  reset(): void {
    this.stub.resetHistory();
  }
}

export function mockSaveProjektiToVelho(): void {
  const stub = sinon.stub(velho, "saveProjekti");
  mocha.afterEach(() => {
    if (stub.getCalls().length > 0) {
      expect({
        "velho.saveProjekti": stub.getCalls().map((call) => call.args),
      }).toMatchSnapshot();
    }
    stub.reset();
  });
}

export class SchedulerMock {
  private createStub!: sinon.SinonStub;
  private deleteStub!: sinon.SinonStub;
  private listSchedulesStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.createStub = sinon.stub(getScheduler(), "createSchedule");
      this.deleteStub = sinon.stub(getScheduler(), "deleteSchedule");
      this.listSchedulesStub = sinon.stub(getScheduler(), "listSchedules");
    });
    mocha.beforeEach(() => {
      awsMockResolves(this.createStub, {});
      awsMockResolves(this.deleteStub, {});
      awsMockResolves(this.listSchedulesStub, { Schedules: [] });
    });
  }

  async verifyAndRunSchedule(): Promise<void> {
    if (this.createStub.getCalls().length > 0) {
      const calls: CreateScheduleInput[] = this.createStub
        .getCalls()
        .map((call) => {
          const input = call.args[0] as unknown as CreateScheduleInput;
          input.GroupName = "***unittest***";
          return input;
        })
        .sort();
      expect(calls).toMatchSnapshot();
      await Promise.all(
        calls.map(async (args: CreateScheduleInput) => {
          assert(args.Target.Input, "args.Target.Input pitäisi olla olemassa");
          const sqsRecord: SQSRecord = { body: args.Target.Input } as unknown as SQSRecord;
          return handleEvent({ Records: [sqsRecord] }, undefined as unknown as Context, undefined as unknown as Callback);
        })
      );
      this.createStub.reset();
      awsMockResolves(this.createStub, {});
    }

    expectAwsCalls(this.deleteStub, "GroupName");
    this.deleteStub.reset();
    awsMockResolves(this.deleteStub, {});
  }
}

export function mockKirjaamoOsoitteet(): void {
  let kirjaamoOsoitteetStub: sinon.SinonStub;
  mocha.before(() => {
    kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet");
  });
  mocha.beforeEach(() => {
    const osoite: KirjaamoOsoite = {
      __typename: "KirjaamoOsoite",
      sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
      nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY,
    };
    kirjaamoOsoitteetStub.resolves([osoite]);
  });
}

function mockOpenSearch() {
  const queryMocks: sinon.SinonStub[] = [];
  mocha.before(() => {
    queryMocks.push(sinon.stub(openSearchClientYllapito, "query"));
    sinon.stub(openSearchClientYllapito, "deleteDocument");
    sinon.stub(openSearchClientYllapito, "putDocument");
    queryMocks.push(sinon.stub(openSearchClientIlmoitustauluSyote, "query"));
    sinon.stub(openSearchClientIlmoitustauluSyote, "deleteDocument");
    sinon.stub(openSearchClientIlmoitustauluSyote, "putDocument");

    queryMocks.push(sinon.stub(openSearchClientJulkinen[Kieli.SUOMI], "query"));
    sinon.stub(openSearchClientJulkinen[Kieli.SUOMI], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[Kieli.SUOMI], "putDocument");

    queryMocks.push(sinon.stub(openSearchClientJulkinen[Kieli.RUOTSI], "query"));
    sinon.stub(openSearchClientJulkinen[Kieli.RUOTSI], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[Kieli.RUOTSI], "putDocument");

    queryMocks.push(sinon.stub(openSearchClientJulkinen[Kieli.POHJOISSAAME], "query"));
    sinon.stub(openSearchClientJulkinen[Kieli.POHJOISSAAME], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[Kieli.POHJOISSAAME], "putDocument");
  });

  mocha.beforeEach(() => {
    queryMocks.forEach((qm) => qm.resolves({ status: 200 }));
  });
}

let lyhytOsoiteStub: sinon.SinonStub;

function mockLyhytOsoite() {
  mocha.before(() => {
    lyhytOsoiteStub = sinon.stub(lyhytOsoiteDatabase, "randomizeLyhytOsoite");
  });
  mocha.beforeEach(() => {
    // Generoidaan oid:n perusteella aina vakio lyhytosoite, eikä arvota sitä kuten oikeasti.
    lyhytOsoiteStub.callsFake((oid) => {
      return crypto.createHash("shake256", { outputLength: 2 }).update(oid).digest("hex");
    });
  });
}

export function defaultMocks(): {
  schedulerMock: SchedulerMock;
  emailClientStub: EmailClientStub;
  importAineistoMock: ImportAineistoMock;
  awsCloudfrontInvalidationStub: CloudFrontStub;
} {
  mockKirjaamoOsoitteet();
  mockOpenSearch();
  setupLocalDatabase();
  const schedulerMock = new SchedulerMock();
  const emailClientStub = new EmailClientStub();
  const importAineistoMock = new ImportAineistoMock();
  const awsCloudfrontInvalidationStub = new CloudFrontStub();
  mockLyhytOsoite();
  return { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub };
}

export async function verifyProjektiSchedule(oid: string, description: string): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  expectToMatchSnapshot(description, new ProjektiAineistoManager(dbProjekti).getSchedule());
}

export const PATH_EU_LOGO = __dirname + "/../../../../cypress/fixtures/eu-logo.jpg";
export const PATH_KUNTA_LOGO = __dirname + "/../../../../cypress/fixtures/logo.png";

export async function addLogoFilesToProjekti(oid: string): Promise<void> {
  await fileService.createFileToProjekti({
    oid,
    fileName: "suunnittelusopimus/logo.png",
    path: new ProjektiPaths(oid),
    contentType: "image/png",
    contents: fs.readFileSync(PATH_KUNTA_LOGO),
  });

  await fileService.createFileToProjekti({
    oid,
    fileName: "euLogot/FI/logofi.png",
    path: new ProjektiPaths(oid),
    contentType: "image/png",
    contents: fs.readFileSync(PATH_EU_LOGO),
  });

  await fileService.createFileToProjekti({
    oid,
    fileName: "euLogot/SV/logosv.png",
    path: new ProjektiPaths(oid),
    contentType: "image/png",
    contents: fs.readFileSync(PATH_EU_LOGO),
  });
}
