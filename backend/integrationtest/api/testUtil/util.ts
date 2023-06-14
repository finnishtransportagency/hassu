import { cleanupGeneratedIds } from "./cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
import { AineistoInput, IlmoitettavaViranomainen, Kieli, KirjaamoOsoite, VelhoAineisto } from "../../../../common/graphql/apiModel";
import { loadProjektiJulkinenFromDatabase } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import * as sinon from "sinon";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { handleEvent as pdfGenerator } from "../../../src/asiakirja/lambda/pdfGeneratorHandler";
import { emailClient, EmailOptions } from "../../../src/email/email";
import { Attachment } from "nodemailer/lib/mailer";
import { EnhancedPDF } from "../../../src/asiakirja/asiakirjaTypes";
import { GeneratePDFEvent } from "../../../src/asiakirja/lambda/generatePDFEvent";
import { velho } from "../../../src/velho/velhoClient";
import mocha from "mocha";
import { NotFoundError } from "../../../src/error/NotFoundError";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { expectAwsCalls } from "../../../test/aws/awsMock";
import {
  CreateScheduleCommand,
  CreateScheduleCommandInput,
  DeleteScheduleCommand,
  ListSchedulesCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";
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
import { personSearchUpdaterClient } from "../../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../../src/personSearch/lambda/personSearchUpdaterHandler";
import { velhoCache } from "./cachingVelhoClient";
import { mockClient } from "aws-sdk-client-mock";
import { CloudFront } from "@aws-sdk/client-cloudfront";
import { AloitusKuulutusJulkaisu, KasittelynTila } from "../../../src/database/model";
import MockDate from "mockdate";
import orderBy from "lodash/orderBy";
import { dateTimeToString, nyt } from "../../../src/util/dateUtil";
import { parameters } from "../../../src/aws/parameters";
import { mockUUID } from "../../shared/sharedMock";

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
  expect({ description, mockedtime: dateTimeToString(nyt()), obj }).toMatchSnapshot();
}

export function adaptAineistoToInput(aineistot: VelhoAineisto[]): AineistoInput[] {
  return aineistot
    .map((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi } = aineisto;
      return { jarjestys: index + 1, nimi, dokumenttiOid };
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export async function expectJulkinenNotFound(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.logout();
  await expect(loadProjektiJulkinenFromDatabase(oid)).to.eventually.be.rejectedWith(NotFoundError);
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export class PDFGeneratorStub {
  private pdfGeneratorLambdaStub!: sinon.SinonStub<[GeneratePDFEvent], Promise<EnhancedPDF>>;
  private pdfs: Pick<EnhancedPDF, "nimi" | "textContent">[] = [];

  constructor() {
    mocha.before(() => {
      this.pdfGeneratorLambdaStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    });
    mocha.beforeEach(() => {
      this.pdfGeneratorLambdaStub.callsFake(async (event) => {
        const pdf: EnhancedPDF = await pdfGenerator(event);
        this.pdfs.push({ nimi: pdf.nimi, textContent: pdf.textContent });
        return pdf;
      });
    });
  }

  verifyAllPDFContents(): void {
    const pdfs = this.pdfs;
    if (pdfs.length > 0) {
      expectToMatchSnapshot(
        "PDF:ien sisällöt",
        pdfs.sort((pdf1, pdf2) => pdf1.nimi.localeCompare(pdf2.nimi))
      );
    }
  }
}

export class EmailClientStub {
  private sendEmailStub!: sinon.SinonStub;
  private sendTurvapostiEmailStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.sendEmailStub = sinon.stub(emailClient, "sendEmail");
      this.sendTurvapostiEmailStub = sinon.stub(emailClient, "sendTurvapostiEmail");
    });
    mocha.beforeEach(() => {
      const fakeEmailSender = (options: EmailOptions) => {
        return Promise.resolve({
          messageId: "messageId_test",
          accepted: (options.to || []) as string[],
          rejected: [],
          pending: [],
        } as unknown as SMTPTransport.SentMessageInfo);
      };
      this.sendEmailStub.callsFake(fakeEmailSender);
      this.sendTurvapostiEmailStub.callsFake(fakeEmailSender);
    });
  }

  verifyEmailsSent(): void {
    function verifyEmailsSentThroughStub(stub: sinon.SinonStub) {
      if (stub.getCalls().length > 0) {
        expect(
          stub
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
        stub.resetHistory();
      }
    }

    verifyEmailsSentThroughStub(this.sendEmailStub);
    verifyEmailsSentThroughStub(this.sendTurvapostiEmailStub);
  }
}

export class CloudFrontStub {
  private stub = mockClient(CloudFront);

  constructor() {
    mocha.beforeEach(() => {
      this.stub.onAnyCommand().resolves({});
    });
    mocha.afterEach(() => {
      this.stub.reset();
    });
  }

  verifyCloudfrontWasInvalidated(expectedNumberOfCalls?: number): void {
    expectAwsCalls("createInvalidation", this.stub.calls(), "CallerReference");
    if (expectedNumberOfCalls) {
      expect(this.stub.calls()).to.have.length(expectedNumberOfCalls);
    }
    this.reset();
  }

  reset(): void {
    this.stub.resetHistory();
  }
}

export class ParametersStub {
  private stub!: sinon.SinonStub;
  asianhallintaEnabled = false;

  constructor() {
    mocha.before(() => {
      this.stub = sinon.stub(parameters, "getParameter");
    });
    mocha.beforeEach(() => {
      this.stub.withArgs("AsianhallintaIntegrationEnabled").callsFake(async () => String(this.asianhallintaEnabled));
    });
  }
}

export type SaveProjektiToVelhoMocks = {
  saveKasittelynTilaStub: sinon.SinonStub<[oid: string, kasittelynTila: KasittelynTila], Promise<void>>;
  saveProjektiAloituskuulutusPaivaStub: sinon.SinonStub<[oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu], Promise<void>>;
};

export function mockSaveProjektiToVelho(): SaveProjektiToVelhoMocks {
  const saveKasittelynTilaStub = sinon.stub(velho, "saveKasittelynTila");
  const saveProjektiAloituskuulutusPaivaStub = sinon.stub(velho, "saveProjektiAloituskuulutusPaiva");
  mocha.afterEach(() => {
    if (saveKasittelynTilaStub.getCalls().length > 0) {
      expect({
        "velho.saveKasittelynTila": saveKasittelynTilaStub.getCalls().map((call) => call.args),
      }).toMatchSnapshot();
    }
    if (saveProjektiAloituskuulutusPaivaStub.getCalls().length > 0) {
      expect({
        "velho.saveProjektiAloituskuulutusPaiva": saveProjektiAloituskuulutusPaivaStub.getCalls().map((call) => call.args),
      }).toMatchSnapshot();
    }
    saveProjektiAloituskuulutusPaivaStub.reset();
    saveKasittelynTilaStub.reset();
  });
  return { saveKasittelynTilaStub, saveProjektiAloituskuulutusPaivaStub };
}

export class SchedulerMock {
  private schedulerStub = mockClient(SchedulerClient);

  constructor() {
    mocha.beforeEach(() => {
      this.schedulerStub.on(ListSchedulesCommand).resolves({ Schedules: [] });
    });
    mocha.afterEach(() => {
      this.schedulerStub.reset();
    });
  }

  async verifyAndRunSchedule(): Promise<void> {
    const createCalls = this.schedulerStub.commandCalls(CreateScheduleCommand);
    if (createCalls.length > 0) {
      const calls: CreateScheduleCommandInput[] = createCalls
        .map((call) => {
          const input = call.args[0].input as unknown as CreateScheduleCommandInput;
          input.GroupName = "***unittest***";
          return input;
        })
        .sort();
      expect(calls).toMatchSnapshot();
      await Promise.all(
        calls.map(async (args: CreateScheduleCommandInput) => {
          assert(args.Target?.Input, "args.Target.Input pitäisi olla olemassa");
          const sqsRecord: SQSRecord = { body: args.Target.Input } as unknown as SQSRecord;
          return handleEvent({ Records: [sqsRecord] }, undefined as unknown as Context, undefined as unknown as Callback);
        })
      );
    }

    expectAwsCalls("deleteSchedule", this.schedulerStub.commandCalls(DeleteScheduleCommand), "GroupName");
    this.schedulerStub.resetHistory();
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

let readUsersFromSearchUpdaterLambdaStub: sinon.SinonStub;

export function mockPersonSearchUpdaterClient(): void {
  mocha.before(() => {
    readUsersFromSearchUpdaterLambdaStub = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
  });
  mocha.beforeEach(() => {
    readUsersFromSearchUpdaterLambdaStub.callsFake(async () => {
      return personSearchUpdaterHandler.handleEvent();
    });
  });
}

function setupMockDate() {
  mocha.beforeEach(() => {
    MockDate.set("2020-01-01");
  });
  // Vaihdettu afterEach:sta afteriksi, jotta kaikki afterEach-hookit tulisivat edelleen ajettua mockatulla ajalla
  mocha.after(() => {
    MockDate.reset();
  });
}

export function defaultMocks(): {
  schedulerMock: SchedulerMock;
  emailClientStub: EmailClientStub;
  importAineistoMock: ImportAineistoMock;
  awsCloudfrontInvalidationStub: CloudFrontStub;
  pdfGeneratorStub: PDFGeneratorStub;
  parametersStub: ParametersStub;
} {
  mockKirjaamoOsoitteet();
  mockOpenSearch();
  setupLocalDatabase();
  const schedulerMock = new SchedulerMock();
  const emailClientStub = new EmailClientStub();
  const importAineistoMock = new ImportAineistoMock();
  const awsCloudfrontInvalidationStub = new CloudFrontStub();
  const pdfGeneratorStub = new PDFGeneratorStub();
  const parametersStub = new ParametersStub();
  mockLyhytOsoite();
  mockPersonSearchUpdaterClient();
  setupMockDate();
  velhoCache();
  mockUUID();
  return { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub, pdfGeneratorStub, parametersStub };
}

export async function verifyProjektiSchedule(oid: string, description: string): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  expectToMatchSnapshot(description + ", schedule", orderBy(new ProjektiAineistoManager(dbProjekti).getSchedule(), "date"));
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
