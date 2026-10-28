// Contains code generated or recommended by Amazon Q
import { describe } from "mocha";
import * as sinon from "sinon";
import { expect } from "chai";
import { mielipideEmailService } from "../../src/mielipide/mielipideEmailService";
import { emailClient } from "../../src/email/email";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { DBMielipide } from "../../src/database/mielipideDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import MockDate from "mockdate";

describe("mielipideEmailService", () => {
  const fixture = new ProjektiFixture();
  let sendTurvapostiEmailStub: sinon.SinonStub;
  let kirjaamoOsoitteetStub: sinon.SinonStub;

  const kirjaamot = [
    { nimi: "UUDENMAAN_ELY", sahkoposti: "kirjaamo.uusimaa@ely-keskus.fi" },
    { nimi: "VAYLAVIRASTO", sahkoposti: "kirjaamo@vayla.fi" },
  ];

  beforeEach(() => {
    sendTurvapostiEmailStub = sinon.stub(emailClient, "sendTurvapostiEmail").resolves({
      accepted: ["kirjaamo.uusimaa@ely-keskus.fi"],
      rejected: [],
    } as any); // aws-sdk-client-mock type incompatibility with @smithy/types
    kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet").resolves(kirjaamot as any); // KirjaamoOsoite __typename not needed in tests
    MockDate.set("2024-04-09T03:00:00+03:00");
  });

  afterEach(() => {
    sinon.restore();
    MockDate.reset();
  });

  it("should send email to correct kirjaamo with correct content", async () => {
    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id-123",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Haluaisin, että tien linjaus kulkisi kauempana talostani",
      etunimi: "Tessa",
      sukunimi: "Testaaja",
      lahiosoite: "Testikatu 1",
      postinumero: "00100",
      postitoimipaikka: "Helsinki",
      sahkoposti: "tessa@test.fi",
      puhelinnumero: "0501234567",
    };

    await mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide);

    sinon.assert.calledOnce(sendTurvapostiEmailStub);
    const emailOptions = sendTurvapostiEmailStub.firstCall.args[0];

    expect(emailOptions).toMatchSnapshot();
    expect(emailOptions.to).to.equal("kirjaamo.uusimaa@ely-keskus.fi");
    expect(emailOptions.subject).to.include("Tessa Testaaja");
    expect(emailOptions.text).to.include("Tessa Testaaja");
    expect(emailOptions.text).to.include("Haluaisin, että tien linjaus kulkisi kauempana talostani");
    expect(emailOptions.text).to.include("tessa@test.fi");
    expect(emailOptions.text).to.include("0501234567");
    expect(emailOptions.text).to.include("Testikatu 1");
    expect(emailOptions.text).to.include("00100");
    expect(emailOptions.text).to.include("Helsinki");
    expect(emailOptions.text).to.include("09.04.2024");
  });

  it("should send email with only required fields", async () => {
    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id-456",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Minimaalinen mielipide",
    };

    await mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide);

    sinon.assert.calledOnce(sendTurvapostiEmailStub);
    const emailOptions = sendTurvapostiEmailStub.firstCall.args[0];
    expect(emailOptions.to).to.equal("kirjaamo.uusimaa@ely-keskus.fi");
    expect(emailOptions.text).to.include("Minimaalinen mielipide");
  });

  it("should include country name in email when maakoodi is set", async () => {
    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id-789",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Testi ulkomailta",
      lahiosoite: "Test Street 1",
      postinumero: "12345",
      postitoimipaikka: "Stockholm",
      maakoodi: "SE",
    };

    await mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide);

    const emailOptions = sendTurvapostiEmailStub.firstCall.args[0];
    expect(emailOptions.text).to.include("Ruotsi");
  });

  it("should not include country line in email when maakoodi is not set (Finland default)", async () => {
    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id-101",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Testi suomalaiselta",
    };

    await mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide);

    const emailOptions = sendTurvapostiEmailStub.firstCall.args[0];
    expect(emailOptions.text).to.not.include("Suomi");
  });

  it("should throw when kirjaamo address is not found for viranomainen", async () => {
    kirjaamoOsoitteetStub.resolves([{ nimi: "VAYLAVIRASTO", sahkoposti: "kirjaamo@vayla.fi" }]);

    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Testi",
    };

    await expect(mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide)).to.eventually.be.rejectedWith(
      "kirjaamon osoitetta ei löytynyt"
    );
  });

  it("should throw when sendTurvapostiEmail returns falsy", async () => {
    sendTurvapostiEmailStub.resolves(undefined);

    const mielipide: DBMielipide = {
      oid: fixture.PROJEKTI3_OID,
      id: "test-id",
      expires: 9999999999,
      lisatty: "2024-04-09T03:00:00+03:00",
      mielipide: "Testi",
    };

    await expect(mielipideEmailService.sendEmailToKirjaamo(fixture.dbProjekti3, mielipide)).to.eventually.be.rejectedWith(
      "sähköpostin lähetys ei palauttanut onnistunutta vastausta"
    );
  });
});
