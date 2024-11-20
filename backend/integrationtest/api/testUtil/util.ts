import { cleanupGeneratedIds } from "../../../commonTestUtil/cleanUpFunctions";
import { fileService } from "../../../src/files/fileService";
import {
  Aineisto,
  AineistoInput,
  AineistoTila,
  AsianTila,
  IlmoitettavaViranomainen,
  KirjaamoOsoite,
  Status,
  VelhoAineisto,
} from "hassu-common/graphql/apiModel";
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
import { NotFoundError } from "hassu-common/error";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { expectAwsCalls } from "../../../test/aws/awsMock";
import { CreateScheduleCommand, CreateScheduleCommandInput, ListSchedulesCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { handleEvent } from "../../../src/sqsEvents/sqsEventHandlerLambda";
import { Callback, Context } from "aws-lambda";
import { SQSRecord } from "aws-lambda/trigger/sqs";
import assert from "assert";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { kirjaamoOsoitteetService } from "../../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { assertIsDefined } from "../../../src/util/assertions";
import { lyhytOsoiteDatabase } from "../../../src/database/lyhytOsoiteDatabase";
import crypto from "crypto";
import { EventSqsClientMock } from "./eventSqsClientMock";
import { ProjektiPaths } from "../../../src/files/ProjektiPath";
import fs from "fs";
import { setupLocalDatabase } from "../../util/databaseUtil";
import { personSearchUpdaterClient } from "../../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../../src/personSearch/lambda/personSearchUpdaterHandler";
import { mockClient } from "aws-sdk-client-mock";
import { CloudFront } from "@aws-sdk/client-cloudfront";
import { AloitusKuulutusJulkaisu, KasittelynTila } from "../../../src/database/model";
import MockDate from "mockdate";
import orderBy from "lodash/orderBy";
import { dateTimeToString, nyt, parseDate } from "../../../src/util/dateUtil";
import { parameters } from "../../../src/aws/parameters";
import { mockUUID } from "../../shared/sharedMock";
import { EmailOptions } from "../../../src/email/model/emailOptions";

import { expect } from "chai";
import { ProjektiScheduleManager } from "../../../src/sqsEvents/projektiScheduleManager";
import { asianhallintaService } from "../../../src/asianhallinta/asianhallintaService";
import { SqsEvent } from "../../../src/sqsEvents/sqsEvent";
import { mockOpenSearch } from "../../../commonTestUtil/mockOpenSearch";
import { uuid } from "hassu-common/util/uuid";

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

export function adaptAineistoToInput(aineistot: VelhoAineisto[], oidPaate?: string): AineistoInput[] {
  return aineistot
    .map<AineistoInput>((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi } = aineisto;
      const input: AineistoInput = {
        jarjestys: index + 1,
        nimi,
        dokumenttiOid,
        tila: AineistoTila.ODOTTAA_TUONTIA,
        // uuid on mockattu testeissä, mutta antaa saman arvon kaikille tässä mappauksessa, joten lisätään juttuja perään
        uuid: uuid.v4() + dokumenttiOid.substring(0, 3) + index + (oidPaate ?? ""),
      };
      return input;
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export function adaptAPIAineistoToInput(aineistot: Aineisto[]): AineistoInput[] {
  return aineistot.map<AineistoInput>((aineisto, index) => {
    const { dokumenttiOid, tiedosto, uuid, tila, nimi } = aineisto;
    const input: AineistoInput = { jarjestys: index + 1, nimi: nimi ?? tiedosto, dokumenttiOid, tila, uuid };
    return input;
  });
}

export async function expectJulkinenNotFound(oid: string, userFixture: UserFixture, error = NotFoundError): Promise<void> {
  userFixture.logout();
  await expect(loadProjektiJulkinenFromDatabase(oid)).to.eventually.be.rejectedWith(error);
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export async function expectStatusEiJulkaistu(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.logout();
  const value = await loadProjektiJulkinenFromDatabase(oid);
  expect(Object.keys(value).length).to.eql(4);
  expect(value.__typename).to.eql("ProjektiJulkinen");
  expect(value.status).to.eql(Status.EI_JULKAISTU);
  expect(value.oid).to.eql(oid);
  expect(Object.keys(value.velho || {}).length).to.eql(1);
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
  public sendEmailStub!: sinon.SinonStub;
  public sendTurvapostiEmailStub!: sinon.SinonStub;

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
    mocha.before(() => this.stub.reset());
    mocha.beforeEach(() => {
      this.stub.onAnyCommand().resolves({});
    });
    mocha.afterEach(() => this.stub.reset());
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
  ashaOsoite = "https://www.fake-asha-testiasianhallinta.com";
  uspaOsoite = "https://www.fake-uspa-testiasianhallinta.com";

  constructor() {
    mocha.before(() => {
      this.stub = sinon.stub(parameters, "getParameter");
    });
    mocha.beforeEach(() => {
      this.stub.withArgs("AsianhallintaIntegrationEnabled").callsFake(() => String(this.asianhallintaEnabled));
      this.stub.withArgs("AshaBaseUrl").callsFake(() => String(this.ashaOsoite));
      this.stub.withArgs("UspaBaseUrl").callsFake(() => String(this.uspaOsoite));
    });
  }
}

export type SaveProjektiToVelhoMocks = {
  saveKasittelynTilaStub: sinon.SinonStub<[oid: string, kasittelynTila: KasittelynTila], Promise<void>>;
  saveProjektiAloituskuulutusPaivaStub: sinon.SinonStub<[oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu], Promise<void>>;
};

export function mockSaveProjektiToVelho(velhoStub: VelhoStub): SaveProjektiToVelhoMocks {
  const saveKasittelynTilaStub = velhoStub.saveKasittelynTilaStub ?? sinon.stub(velho, "saveKasittelynTila");
  const saveProjektiAloituskuulutusPaivaStub =
    velhoStub.saveProjektiAloituskuulutusPaivaStub ?? sinon.stub(velho, "saveProjektiAloituskuulutusPaiva");
  const saveProjektiSuunnitelmanTilaStub = velhoStub.saveProjektiSuunnitelmanTilaStub ?? sinon.stub(velho, "saveProjektiSuunnitelmanTila");
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
    if (saveProjektiSuunnitelmanTilaStub.getCalls().length > 0) {
      expect({
        "velho.saveProjektiSuunnitelmanTila": saveProjektiSuunnitelmanTilaStub.getCalls().map((call) => call.args),
      }).toMatchSnapshot();
    }
    saveProjektiAloituskuulutusPaivaStub.reset();
    saveKasittelynTilaStub.reset();
    saveProjektiSuunnitelmanTilaStub.reset();
  });
  return { saveKasittelynTilaStub, saveProjektiAloituskuulutusPaivaStub };
}

export class SchedulerMock {
  private schedulerStub = mockClient(SchedulerClient);
  private schedules: Set<CreateScheduleCommandInput> = new Set<CreateScheduleCommandInput>();

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
      createCalls
        .map((call) => {
          const input = call.args[0].input as unknown as CreateScheduleCommandInput;
          input.GroupName = "***unittest***";
          return input;
        })
        .forEach((call) => this.schedules.add(call));
    }
    expect(Array.from(this.schedules).sort()).toMatchSnapshot();
    await Array.from(this.schedules).reduce((promiseChain, args: CreateScheduleCommandInput) => {
      return promiseChain.then(async () => {
        assert(args.Target?.Input, "args.Target.Input pitäisi olla olemassa");
        const event: SqsEvent = JSON.parse(args.Target?.Input);
        if (!event.date || (event.date && parseDate(event.date).isBefore(nyt()))) {
          const sqsRecord: SQSRecord = { body: args.Target.Input } as unknown as SQSRecord;
          this.schedules.delete(args);
          await handleEvent({ Records: [sqsRecord] }, undefined as unknown as Context, undefined as unknown as Callback);
          return;
        }
      });
    }, Promise.resolve());
    this.schedulerStub.resetHistory();
  }
}

export function mockKirjaamoOsoitteet(): void {
  let kirjaamoOsoitteetStub: sinon.SinonStub;
  mocha.before(() => {
    kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet");
  });
  mocha.beforeEach(() => {
    const osoitteet: KirjaamoOsoite[] = [
      {
        __typename: "KirjaamoOsoite",
        sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
        nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY,
      },
      {
        __typename: "KirjaamoOsoite",
        sahkoposti: "kirjaamo@vayla.vayla",
        nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
      },
    ];
    kirjaamoOsoitteetStub.resolves(osoitteet);
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

let checkAsianhallintaStateLambdaStub: sinon.SinonStub;
let getAsiaIdLambdaStub: sinon.SinonStub;

export function mockAsianhallintaService(): void {
  mocha.before(() => {
    checkAsianhallintaStateLambdaStub = sinon.stub(asianhallintaService, "checkAsianhallintaState");
    getAsiaIdLambdaStub = sinon.stub(asianhallintaService, "getAsiaId");
  });
  mocha.beforeEach(() => {
    checkAsianhallintaStateLambdaStub.callsFake(() => AsianTila.VALMIS_VIENTIIN);
    getAsiaIdLambdaStub.callsFake(() => 11212);
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

export class VelhoStub {
  public saveKasittelynTilaStub!: sinon.SinonStub<[oid: string, kasittelynTila: KasittelynTila], Promise<void>>;
  public saveProjektiAloituskuulutusPaivaStub!: sinon.SinonStub<
    [oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu],
    Promise<void>
  >;
  public saveProjektiSuunnitelmanTilaStub!: sinon.SinonStub;
  public loadVelhoProjektiByOidStub!: sinon.SinonStub;
  constructor() {
    mocha.before(() => {
      sinon.stub(velho, "authenticate");
      sinon.stub(velho, "createProjektiForTesting");
      sinon.stub(velho, "deleteProjektiForTesting");
      sinon.stub(velho, "getAineisto");
      sinon.stub(velho, "getLinkForDocument");
      this.loadVelhoProjektiByOidStub = sinon.stub(velho, "loadProjekti");
      sinon.stub(velho, "loadProjektiAineistot");
      sinon.stub(velho, "logout");
      this.saveKasittelynTilaStub = sinon.stub(velho, "saveKasittelynTila");
      this.saveProjektiAloituskuulutusPaivaStub = sinon.stub(velho, "saveProjektiAloituskuulutusPaiva");
      this.saveProjektiSuunnitelmanTilaStub = sinon.stub(velho, "saveProjektiSuunnitelmanTila");
      sinon.stub(velho, "searchProjects");
    });
  }
}

export function defaultMocks(): {
  schedulerMock: SchedulerMock;
  emailClientStub: EmailClientStub;
  eventSqsClientMock: EventSqsClientMock;
  awsCloudfrontInvalidationStub: CloudFrontStub;
  pdfGeneratorStub: PDFGeneratorStub;
  parametersStub: ParametersStub;
  velhoStub: VelhoStub;
} {
  mockKirjaamoOsoitteet();
  mockOpenSearch();
  setupLocalDatabase();
  const schedulerMock = new SchedulerMock();
  const emailClientStub = new EmailClientStub();
  const eventSqsClientMock = new EventSqsClientMock();
  const awsCloudfrontInvalidationStub = new CloudFrontStub();
  const pdfGeneratorStub = new PDFGeneratorStub();
  const parametersStub = new ParametersStub();
  mockLyhytOsoite();
  mockPersonSearchUpdaterClient();
  mockAsianhallintaService();
  setupMockDate();
  mockUUID();
  const velhoStub = new VelhoStub();
  return { schedulerMock, emailClientStub, eventSqsClientMock, awsCloudfrontInvalidationStub, pdfGeneratorStub, parametersStub, velhoStub };
}

export async function verifyProjektiSchedule(oid: string, description: string): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  expectToMatchSnapshot(description + ", schedule", orderBy(new ProjektiScheduleManager(dbProjekti).getSchedule(), "date"));
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

export function removeTiedosto<T extends Record<string, any>>(obj: T | null | undefined): Omit<T, "tiedosto"> | null | undefined {
  if (!obj) return obj;
  const copy = Object.assign({}, obj);
  delete copy.tiedosto;
  return copy;
}
