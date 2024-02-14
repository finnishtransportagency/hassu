import { SQSEvent } from "aws-lambda";
import { setLogContextOid } from "../../src/logger";
import { SuomiFiSanoma, handleEvent, lahetaSuomiFiViestit, setMockSuomiFiClient } from "../../src/suomifi/suomifiHandler";
import { identifyMockUser } from "../../src/user/userService";
import { mockClient } from "aws-sdk-client-mock";
import { BatchGetCommand, DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { parameters } from "../../src/aws/parameters";
import * as sinon from "sinon";
import { config } from "../../src/config";
import { DBMuistuttaja } from "../../src/muistutus/muistutusHandler";
import { now } from "lodash";
import { emailClient } from "../../src/email/email";
import { assert, expect } from "chai";
import { Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { PdfViesti, SuomiFiClient, Viesti } from "../../src/suomifi/viranomaispalvelutwsinterface/suomifi";
import { HaeTilaTietoResponse, ViranomaispalvelutWsInterfaceClient } from "../../src/suomifi/viranomaispalvelutwsinterface";
import { PublishOrExpireEventType } from "../../src/sqsEvents/projektiScheduleManager";
import { fileService } from "../../src/files/fileService";
import {
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaiheJulkaisu,
} from "../../src/database/model";
import { DBOmistaja } from "../../src/database/omistajaDatabase";
import { fail } from "assert";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { EnhancedPDF } from "../../src/asiakirja/asiakirjaTypes";
import { SQS, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

const testiPdf =
  "JVBERi0xLjIgCjkgMCBvYmoKPDwKPj4Kc3RyZWFtCkJULyAzMiBUZiggIFlPVVIgVEVYVCBIRVJFICAgKScgRVQKZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgNSAwIFIKL0NvbnRlbnRzIDkgMCBSCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9LaWRzIFs0IDAgUiBdCi9Db3VudCAxCi9UeXBlIC9QYWdlcwovTWVkaWFCb3ggWyAwIDAgMjUwIDUwIF0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1BhZ2VzIDUgMCBSCi9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iagp0cmFpbGVyCjw8Ci9Sb290IDMgMCBSCj4+CiUlRU9G";
const lambdaResponse: EnhancedPDF = {
  __typename: "PDF",
  nimi: "T415 Ilmoitus kiinteistonomistajat nahtaville asettaminen",
  sisalto: testiPdf,
  textContent: "",
};

type SuomiFiRequest = {
  viesti?: Viesti;
  pdfViesti?: PdfViesti;
};

function mockSuomiFiClient(request: SuomiFiRequest, asiakasTila: number, pdfTilakoodi = 202): SuomiFiClient {
  return {
    getSoapClient: () => undefined as unknown as ViranomaispalvelutWsInterfaceClient,
    haeAsiakas: () => {
      return new Promise((resolve) => {
        resolve({
          HaeAsiakkaitaResult: {
            TilaKoodi: { TilaKoodi: 0 },
            Asiakkaat: { Asiakas: [{ Tila: asiakasTila, attributes: { AsiakasTunnus: "ABC", TunnusTyyppi: "SSN" } }] },
          },
        });
      });
    },
    rajapinnanTila: () => {
      return undefined as unknown as Promise<HaeTilaTietoResponse>;
    },
    lahetaInfoViesti(viesti) {
      request.viesti = viesti;
      return new Promise((resolve) => {
        resolve({
          LisaaKohteitaResult: {
            TilaKoodi: { TilaKoodi: 0 },
            Kohteet: { Kohde: [{ Asiakas: [{ KohteenTila: 200, attributes: { AsiakasTunnus: "ABC", TunnusTyyppi: "SSN" } }] }] },
          },
        });
      });
    },
    lahetaViesti(viesti) {
      request.pdfViesti = viesti;
      return new Promise((resolve) => {
        resolve({ LahetaViestiResult: { TilaKoodi: { TilaKoodi: pdfTilakoodi } } });
      });
    },
  };
}

describe("suomifiHandler", () => {
  after(() => {
    //setClient(undefined);
  });

  before(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockClient(LambdaClient)
      .on(InvokeCommand)
      .resolves({ Payload: Buffer.from(JSON.stringify(lambdaResponse)) });
  });

  beforeEach(() => {
    setLogContextOid("1");
    identifyMockUser({ etunimi: "", sukunimi: "", uid: "testuid", __typename: "NykyinenKayttaja" });
  });

  afterEach(() => {
    //parameterStub.restore();
  });

  it("muistuttajan sähköposti annettu", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(false);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "test@test.fi",
      muistutus: "Muistutus 1",
      liite: "test.txt",
    };
    const emailStub = sinon
      .stub(emailClient, "sendEmail")
      .resolves({ accepted: [""], messageId: "", pending: [], rejected: [], response: "", envelope: { from: "", to: ["test@test.fi"] } });
    mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123" } } });
    const body: SuomiFiSanoma = { oid: "1", muistuttajaId: "123" };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(emailStub.callCount).to.equal(1);
    expect(emailStub.args[0]).toMatchSnapshot();
    mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: {
          oid: "1",
          velho: {
            nimi: "Projektin nimi2",
            suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
            asiatunnusVayla: "vayla123",
            asiatunnusELY: "ely123",
          },
        },
      });
    await handleEvent(msg as SQSEvent);
    expect(emailStub.callCount).to.equal(2);
    expect(emailStub.args[1]).toMatchSnapshot();
    delete muistuttaja.liite;
    mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: {
          oid: "1",
          velho: {
            nimi: "Projektin nimi3",
            suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
            asiatunnusVayla: "vayla123",
            asiatunnusELY: "ely123",
          },
        },
      });
    await handleEvent(msg as SQSEvent);
    expect(emailStub.callCount).to.equal(3);
    expect(emailStub.args[2]).toMatchSnapshot();
    parameterStub.restore();
    emailStub.restore();
  });
  it("muistuttajan sähköpostia ei annettu", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(false);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "",
      muistutus: "Muistutus 1",
      liite: "test.txt",
    };
    const emailStub = sinon
      .stub(emailClient, "sendEmail")
      .resolves({ accepted: [""], messageId: "", pending: [], rejected: [], response: "", envelope: { from: "", to: ["test@test.fi"] } });
    mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { oid: "1", velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123" } } });
    const body: SuomiFiSanoma = { oid: "1", muistuttajaId: "123" };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(emailStub.callCount).to.equal(0);
    parameterStub.restore();
    emailStub.restore();
  });
  it("muistuttajan viesti suomi.fi", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "",
      henkilotunnus: "ABC",
      muistutus: "Muistutus 1",
      liite: "test.txt",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { oid: "1", velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123" } } });
    const body: SuomiFiSanoma = { oid: "1", muistuttajaId: "123" };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(request.viesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(0);
    parameterStub.restore();
  });
  it("muistuttajan viesti suomi.fi paperiposti", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "test@test.fi",
      henkilotunnus: "ABC",
      muistutus: "Muistutus 1",
      liite: "test.txt",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 310);
    setMockSuomiFiClient(client);
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { oid: "1", velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123" } } });
    const emailStub = sinon
      .stub(emailClient, "sendEmail")
      .resolves({ accepted: [""], messageId: "", pending: [], rejected: [], response: "", envelope: { from: "", to: ["test@test.fi"] } });
    const body: SuomiFiSanoma = { oid: "1", muistuttajaId: "123" };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(request.viesti).to.equal(undefined);
    expect(mock.commandCalls(UpdateCommand).length).to.equal(0);
    expect(emailStub.callCount).to.equal(1);
    expect(emailStub.args[0]).toMatchSnapshot();
    parameterStub.restore();
    emailStub.restore();
  });
  it("muistuttajan pdf viesti suomi.fi", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "",
      henkilotunnus: "ABC",
      muistutus: "Muistutus 1",
      liite: "test.txt",
      etunimi: "Testi",
      sukunimi: "Teppo",
      lahiosoite: "Osoite 1",
      postinumero: "00100",
      postitoimipaikka: "Helsinki",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      nahtavillaoloVaihe: { id: 1 },
      nahtavillaoloVaiheJulkaisut: [{ id: 1 } as unknown as NahtavillaoloVaiheJulkaisu],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const fileStub = sinon.stub(fileService, "getProjektiFile").resolves(Buffer.from("tiedosto"));
    const body: SuomiFiSanoma = { oid: "1", muistuttajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    assert(request.pdfViesti);
    request.pdfViesti.tiedosto.sisalto = Buffer.from("");
    expect(request.pdfViesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("OK");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    parameterStub.restore();
    fileStub.restore();
  });
  it("muistuttajan pdf viesti suomi.fi ruotsi", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const muistuttaja: DBMuistuttaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      sahkoposti: "",
      henkilotunnus: "ABC",
      muistutus: "Muistutus 1",
      liite: "test.txt",
      etunimi: "Minerva",
      sukunimi: "Marttila",
      lahiosoite: "Svart katten's gatan 13 c 13, B.O.X 1010",
      postinumero: "SE-",
      postitoimipaikka: "01230 STOCKHOLM, Ruotsii",
      maakoodi: "SE",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      nahtavillaoloVaihe: { id: 1 },
      nahtavillaoloVaiheJulkaisut: [{ id: 1 } as unknown as NahtavillaoloVaiheJulkaisu],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.muistuttaja2TableName })
      .resolves({ Item: muistuttaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const body: SuomiFiSanoma = { muistuttajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO, oid: "1" };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    assert(request.pdfViesti);
    request.pdfViesti.tiedosto.sisalto = Buffer.from("");
    expect(request.pdfViesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("OK");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    parameterStub.restore();
  });
  it("omistajan pdf viesti suomi.fi", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const omistaja: DBOmistaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      henkilotunnus: "ABC",
      etunimet: "Testi",
      sukunimi: "Teppo",
      jakeluosoite: "Osoite 1",
      postinumero: "00100",
      paikkakunta: "Helsinki",
      kiinteistotunnus: "123",
      suomifiLahetys: true,
      kaytossa: true,
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      nahtavillaoloVaihe: { id: 1 },
      nahtavillaoloVaiheJulkaisut: [{ id: 1 } as unknown as NahtavillaoloVaiheJulkaisu],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.kiinteistonomistajaTableName })
      .resolves({ Item: omistaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const fileStub = sinon.stub(fileService, "getProjektiFile").resolves(Buffer.from("tiedosto"));
    const body: SuomiFiSanoma = { oid: "1", omistajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    assert(request.pdfViesti);
    request.pdfViesti.tiedosto.sisalto = Buffer.from("");
    expect(request.pdfViesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("OK");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    assert(input.Key);
    expect(input.Key["id"]).to.equal("123");
    parameterStub.restore();
    fileStub.restore();
  });
  it("omistajan pdf viesti suomi.fi nähtävilläolo", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const omistaja: DBOmistaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      henkilotunnus: "ABC",
      etunimet: "Testi",
      sukunimi: "Teppo",
      jakeluosoite: "Osoite 1",
      postinumero: "00100",
      paikkakunta: "Helsinki",
      kiinteistotunnus: "123",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      nahtavillaoloVaihe: { id: 1 },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          nahtavillaoloPDFt: {
            RUOTSI: { nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: "/path/11" },
          } as unknown as LocalizedMap<NahtavillaoloPDF>,
        } as unknown as NahtavillaoloVaiheJulkaisu,
        {
          id: 2,
          nahtavillaoloPDFt: {
            RUOTSI: { nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: "/path/22" },
          } as unknown as LocalizedMap<NahtavillaoloPDF>,
        } as unknown as NahtavillaoloVaiheJulkaisu,
      ],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.omistajaTableName })
      .resolves({ Item: omistaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const fileStub = sinon.stub(fileService, "getProjektiFile").resolves(Buffer.from(testiPdf, "base64"));
    const body: SuomiFiSanoma = { omistajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(fileStub.getCalls()[0].args[0]).to.equal("1");
    expect(fileStub.getCalls()[0].args[1]).to.equal("/path/22");
    assert(request.pdfViesti);
    request.pdfViesti.tiedosto.sisalto = Buffer.from("");
    expect(request.pdfViesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("OK");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    assert(input.Key);
    expect(input.Key["id"]).to.equal("123");
    parameterStub.restore();
    fileStub.restore();
  });
  it("omistajan pdf viesti suomi.fi hyväksymispäätös", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const omistaja: DBOmistaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      henkilotunnus: "ABC",
      etunimet: "Testi",
      sukunimi: "Teppo",
      jakeluosoite: "Osoite 1",
      postinumero: "00100",
      paikkakunta: "Helsinki",
      kiinteistotunnus: "123",
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      hyvaksymisPaatosVaihe: { id: 1 },
      hyvaksymisPaatosVaiheJulkaisut: [
        {
          id: 1,
          hyvaksymisPaatosVaihePDFt: {
            RUOTSI: { hyvaksymisIlmoitusMuistuttajillePDFPath: "/path/1" },
          } as unknown as LocalizedMap<HyvaksymisPaatosVaihePDF>,
        } as unknown as HyvaksymisPaatosVaiheJulkaisu,
        {
          id: 2,
          hyvaksymisPaatosVaihePDFt: {
            RUOTSI: { hyvaksymisIlmoitusMuistuttajillePDFPath: "/path/2" },
          } as unknown as LocalizedMap<HyvaksymisPaatosVaihePDF>,
        } as unknown as HyvaksymisPaatosVaiheJulkaisu,
      ],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.omistajaTableName })
      .resolves({ Item: omistaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const fileStub = sinon.stub(fileService, "getProjektiFile").resolves(Buffer.from(testiPdf, "base64"));
    const body: SuomiFiSanoma = { omistajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE };
    const msg = { Records: [{ body: JSON.stringify(body) }] };
    await handleEvent(msg as SQSEvent);
    expect(fileStub.getCalls()[0].args[0]).to.equal("1");
    expect(fileStub.getCalls()[0].args[1]).to.equal("/path/2");
    assert(request.pdfViesti);
    request.pdfViesti.tiedosto.sisalto = Buffer.from("");
    expect(request.pdfViesti).toMatchSnapshot();
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("OK");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE);
    assert(input.Key);
    expect(input.Key["id"]).to.equal("123");
    parameterStub.restore();
    fileStub.restore();
  });
  it("omistajan pdf viesti suomi.fi epäonnistui", async () => {
    const parameterStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    const omistaja: DBOmistaja = {
      id: "123",
      expires: 0,
      lisatty: now().toString(),
      oid: "1",
      henkilotunnus: "ABC",
      etunimet: "Testi",
      sukunimi: "Teppo",
      jakeluosoite: "Osoite 1",
      postinumero: "00100",
      paikkakunta: "Helsinki",
      kiinteistotunnus: "123",
      suomifiLahetys: true,
      kaytossa: true,
    };
    const request: SuomiFiRequest = {};
    const client = mockSuomiFiClient(request, 300, 200);
    setMockSuomiFiClient(client);
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      nahtavillaoloVaihe: { id: 1 },
      nahtavillaoloVaiheJulkaisut: [{ id: 1 } as unknown as NahtavillaoloVaiheJulkaisu],
      velho: { nimi: "Projektin nimi", asiatunnusVayla: "vayla123", asiatunnusELY: "ely123", tyyppi: ProjektiTyyppi.TIE, vaylamuoto: [] },
    };
    const mock = mockClient(DynamoDBDocumentClient)
      .on(GetCommand, { TableName: config.kiinteistonomistajaTableName })
      .resolves({ Item: omistaja })
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({
        Item: dbProjekti,
      });
    const fileStub = sinon.stub(fileService, "getProjektiFile").resolves(Buffer.from("tiedosto"));
    const body: SuomiFiSanoma = { oid: "1", omistajaId: "123", tyyppi: PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO };
    const msg = { Records: [{ body: JSON.stringify(body), messageId: "123456" }] };
    try {
      await handleEvent(msg as SQSEvent);
      fail("Pitäisi heittää poikkeus");
    } catch (e) {
      assert(e instanceof Error);
      expect(e.message).to.equal("Suomi.fi pdf-viestin lähetys epäonnistui");
    }
    expect(mock.commandCalls(UpdateCommand).length).to.equal(1);
    const input = mock.commandCalls(UpdateCommand)[0].args[0].input;
    assert(input.ExpressionAttributeValues);
    expect(input.ExpressionAttributeValues[":status"][0].tila).to.equal("VIRHE");
    expect(input.ExpressionAttributeValues[":status"][0].tyyppi).to.equal(PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    assert(input.Key);
    expect(input.Key["id"]).to.equal("123");
    parameterStub.restore();
    fileStub.restore();
  });
  it("lähetä suomi.fi viestit uniikeille omistajille ja muistuttajille", async () => {
    sinon.stub(parameters, "isSuomiFiIntegrationEnabled").resolves(true);
    sinon.stub(parameters, "getSuomiFiSQSUrl").resolves("");
    const dbProjekti: Partial<DBProjekti> = {
      oid: "1",
      omistajat: ["1", "2", "3", "4", "5"],
      muistuttajat: ["6", "7", "8"],
    };
    mockClient(DynamoDBDocumentClient)
      .on(BatchGetCommand)
      .resolves({
        Responses: {
          [config.kiinteistonomistajaTableName]: [
            { id: "1", henkilotunnus: "ABC" },
            { id: "2", henkilotunnus: "ABC" },
            { id: "3", henkilotunnus: "DEF" },
            { id: "4", ytunnus: "123" },
            { id: "5", ytunnus: "123" },
          ],
          [config.muistuttaja2TableName]: [
            { id: "6", henkilotunnus: "ABC" },
            { id: "7", henkilotunnus: "ABC" },
            { id: "8", henkilotunnus: "CAB" },
          ],
        },
      });
    const mock = mockClient(SQS).on(SendMessageBatchCommand).resolves({ Failed: [], Successful: [] });
    await lahetaSuomiFiViestit(dbProjekti as DBProjekti, PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE);
    expect(mock.commandCalls(SendMessageBatchCommand).length).to.equal(1);
    let input = mock.commandCalls(SendMessageBatchCommand)[0].args[0].input;
    assert(input.Entries);
    let ids = input.Entries.map((e) => e.Id);
    expect(ids.join(",")).to.equal("1,3,4,8");
    await lahetaSuomiFiViestit(dbProjekti as DBProjekti, PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO);
    expect(mock.commandCalls(SendMessageBatchCommand).length).to.equal(2);
    input = mock.commandCalls(SendMessageBatchCommand)[1].args[0].input;
    assert(input.Entries);
    ids = input.Entries.map((e) => e.Id);
    expect(ids.join(",")).to.equal("1,3,4");
    sinon.restore();
  });
});
