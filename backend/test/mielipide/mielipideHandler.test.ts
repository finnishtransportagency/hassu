// Contains code generated or recommended by Amazon Q
import { describe } from "mocha";
import * as sinon from "sinon";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { userService } from "../../src/user";
import { UserFixture } from "../fixture/userFixture";
import { MielipideInput } from "hassu-common/graphql/apiModel";
import { mielipideHandler } from "../../src/mielipide/mielipideHandler";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { S3Mock } from "../aws/awsMock";
import { expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import MockDate from "mockdate";
import { DBMielipide } from "../../src/database/mielipideDatabase";
import { parameters } from "../../src/aws/parameters";
import { EmailEventType } from "../../src/email/model/emailEvent";

describe("mielipideHandler", () => {
  const userFixture = new UserFixture(userService);
  new S3Mock();

  let fixture: ProjektiFixture;
  let loadProjektiByOidStub: sinon.SinonStub;
  let sqsMock: ReturnType<typeof mockClient>;

  beforeEach(() => {
    fixture = new ProjektiFixture();
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    sinon.stub(parameters, "getEmailSQSUrl").resolves("https://sqs.eu-west-1.amazonaws.com/123456789/email-test");
    loadProjektiByOidStub.resolves(fixture.dbProjekti3);
    sqsMock = mockClient(SQSClient);
  });

  afterEach(() => {
    sinon.restore();
    userFixture.logout();
    MockDate.reset();
  });

  it("should save mielipide to database with all fields and send SQS message to email queue", async () => {
    const dbMockClient = mockClient(DynamoDBDocumentClient);
    MockDate.set("2024-04-09T03:00");

    const mielipideInput: MielipideInput = {
      mielipide: "Haluaisin, että tien linjaus kulkisi kauempana talostani",
      etunimi: "Tessa",
      sukunimi: "Testaaja",
      lahiosoite: "Testikatu 1",
      postinumero: "00100",
      postitoimipaikka: "Helsinki",
      sahkoposti: "tessa@test.fi",
      puhelinnumero: "0501234567",
      liitteet: [],
    };

    await mielipideHandler.kasitteleMielipide({ oid: fixture.PROJEKTI3_OID, mielipide: mielipideInput });

    expect(sqsMock.commandCalls(SendMessageCommand).length).to.equal(1);
    const sqsMsg = JSON.parse(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody!);
    expect(sqsMsg.type).to.equal(EmailEventType.MIELIPIDE_KIRJAAMO);
    expect(sqsMsg.oid).to.equal(fixture.PROJEKTI3_OID);
    expect(sqsMsg.mielipideId).to.be.a("string");

    expect(dbMockClient.commandCalls(PutCommand).length).to.equal(1);
    const saved = dbMockClient.commandCalls(PutCommand)[0].args[0].input.Item as DBMielipide;
    expect(saved.oid).to.equal(fixture.PROJEKTI3_OID);
    expect(saved.mielipide).to.equal("Haluaisin, että tien linjaus kulkisi kauempana talostani");
    expect(saved.etunimi).to.equal("Tessa");
    expect(saved.sukunimi).to.equal("Testaaja");
    expect(saved.sahkoposti).to.equal("tessa@test.fi");
    expect(saved.puhelinnumero).to.equal("0501234567");
    expect(saved.lahiosoite).to.equal("Testikatu 1");
    expect(saved.postinumero).to.equal("00100");
    expect(saved.postitoimipaikka).to.equal("Helsinki");
    expect(saved.expires).to.be.a("number");
    expect(saved.id).to.be.a("string");
    expect(saved.lisatty).to.be.a("string");
    expect(saved.id).to.equal(sqsMsg.mielipideId);
  });

  it("should work with only required fields (mielipide)", async () => {
    const dbMockClient = mockClient(DynamoDBDocumentClient);

    const mielipideInput: MielipideInput = {
      mielipide: "Minimaalinen mielipide",
      liitteet: [],
    };

    await mielipideHandler.kasitteleMielipide({ oid: fixture.PROJEKTI3_OID, mielipide: mielipideInput });

    expect(sqsMock.commandCalls(SendMessageCommand).length).to.equal(1);
    const saved = dbMockClient.commandCalls(PutCommand)[0].args[0].input.Item as DBMielipide;
    expect(saved.mielipide).to.equal("Minimaalinen mielipide");
    expect(saved.etunimi).to.be.undefined;
    expect(saved.sukunimi).to.be.undefined;
  });

  it("should throw NotFoundError when project is not found", async () => {
    mockClient(DynamoDBDocumentClient);
    loadProjektiByOidStub.resolves(undefined);

    await expect(
      mielipideHandler.kasitteleMielipide({ oid: fixture.PROJEKTI3_OID, mielipide: { mielipide: "Testi", liitteet: [] } })
    ).to.eventually.be.rejectedWith("Projektia ei löydy");
  });

  it("should throw NotFoundError when project is not in NAHTAVILLAOLO status", async () => {
    mockClient(DynamoDBDocumentClient);
    loadProjektiByOidStub.resolves(fixture.dbProjekti2());

    await expect(
      mielipideHandler.kasitteleMielipide({ oid: fixture.PROJEKTI3_OID, mielipide: { mielipide: "Testi", liitteet: [] } })
    ).to.eventually.be.rejectedWith("Projekti ei ole nähtävilläolovaiheessa");
  });
});
