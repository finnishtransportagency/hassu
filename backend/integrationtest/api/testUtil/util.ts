import { cleanupGeneratedIds } from "./cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
import { AineistoInput, VelhoAineisto } from "../../../../common/graphql/apiModel";
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

const { expect } = require("chai");

export async function takeS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  await takeYllapitoS3Snapshot(oid, description, path);
  await takePublicS3Snapshot(oid, description, path);
}

export async function takeYllapitoS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  const obj = await fileService.listYllapitoProjektiFiles(oid, path || "");
  expect({
    ["yllapito S3 files " + description]: cleanupAnyProjektiData(cleanupGeneratedIds(obj)),
  }).toMatchSnapshot(description);
}

export async function takePublicS3Snapshot(oid: string, description: string, path?: string): Promise<void> {
  expect({
    ["public S3 files " + description]: cleanupAnyProjektiData(
      cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, path || "", true))
    ),
  }).toMatchSnapshot(description);
}

export function expectToMatchSnapshot(description: string, obj: unknown): void {
  expect({ description, obj }).toMatchSnapshot();
}

export function adaptAineistoToInput(aineistot: VelhoAineisto[]): AineistoInput[] {
  return aineistot
    .map((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi, kategoriaId } = aineisto;
      return { kategoriaId, jarjestys: index + 1, nimi, dokumenttiOid };
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export function expectApiError(e: Error, message: string): void {
  const contents = JSON.parse(e.message);
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

  init(): void {
    this.emailClientStub = sinon.stub(emailClient, "sendEmail");
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
      this.emailClientStub.reset();
    }
  }
}

export class CloudFrontStub {
  private stub: sinon.SinonStub;

  constructor() {
    this.stub = sinon.stub(getCloudFront(), "createInvalidation");
    awsMockResolves(this.stub, {});
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
  private createStub: sinon.SinonStub;
  private deleteStub: sinon.SinonStub;

  constructor() {
    this.createStub = sinon.stub(getScheduler(), "createSchedule");
    this.deleteStub = sinon.stub(getScheduler(), "deleteSchedule");
    awsMockResolves(this.createStub, {});
    awsMockResolves(this.deleteStub, {});
  }

  async verifyAndRunSchedule(): Promise<void> {
    if (this.createStub.getCalls().length > 0) {
      const calls: CreateScheduleInput[] = this.createStub
        .getCalls()
        .map((call) => call.args[0] as unknown as CreateScheduleInput)
        .sort();
      expect(calls).toMatchSnapshot();
      await Promise.all(
        calls.map(async (args: CreateScheduleInput) => {
          assert(args.Target.Input, "args.Target.Input pitäisi olla olemassa");
          const sqsRecord: SQSRecord = { body: args.Target.Input } as unknown as SQSRecord;
          await handleEvent({ Records: [sqsRecord] }, undefined as unknown as Context, undefined as unknown as Callback);
        })
      );
      this.createStub.reset();
    }

    expectAwsCalls(this.deleteStub);
  }
}
