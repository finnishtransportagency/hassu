import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { api } from "../common/api";
import * as monitoring from "../../../src/aws/monitoring";
import sinon from "sinon";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { ParametersStub } from "../common/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { expect } from "chai";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../src/database/model";
import { adaptHyvaksymisPaatosVaiheToInput } from "hassu-common/util/adaptDBtoInput";
import { assertIsDefined } from "../../../src/util/assertions";
import { hyvaksymisPaatosUudelleenKuulutusAvattu } from "../testProjektis/hyvaksymisPaatosUudelleenKuulutusAvattu";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { EmailClientStub } from "../common/email";
import { S3Mock } from "../common/s3";
import { GeneratePDFEvent } from "../../../src/asiakirja/lambda/generatePDFEvent";
describe("Kun hyväksymispäätöksen uudelleenkuulutuksen lähettää hyväksyttäväksi", () => {
  let personSearchFixture: PersonSearchFixture;
  let getKayttajasStub: sinon.SinonStub;
  let pdfGeneratorStub: sinon.SinonStub;
  let saveProjektiStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let fileServiceCopyYllapitoFolderStub: sinon.SinonStub;
  let updateJulkaisutStub: sinon.SinonStub;
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;
  let projektiInput: API.TallennaProjektiInput;
  const s3Mock = new S3Mock();
  new ParametersStub();
  const emailClientStub = new EmailClientStub();

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    pdfGeneratorStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    pdfGeneratorStub.callsFake((event: GeneratePDFEvent) => {
      return {
        __typename: "PDF",
        nimi: event.createHyvaksymisPaatosKuulutusPdf?.asiakirjaTyyppi + ".pdf",
        sisalto: "sisalto",
        textContent: "textContent",
      };
    });
    projektiAlkutilassa = hyvaksymisPaatosUudelleenKuulutusAvattu;

    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    fileServiceCopyYllapitoFolderStub = sinon.stub(fileService, "copyYllapitoFolder");
    updateJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "update");
    assertIsDefined(projektiAlkutilassa.hyvaksymisPaatosVaihe, "projektiAlkutilassa.hyvaksymisPaatosVaihe on määritelty");
    projektiInput = {
      oid: projektiAlkutilassa.oid,
      versio: projektiAlkutilassa.versio,
      hyvaksymisPaatosVaihe: {
        ...adaptHyvaksymisPaatosVaiheToInput(projektiAlkutilassa.hyvaksymisPaatosVaihe),
        uudelleenKuulutus: {
          selosteKuulutukselle: {
            SUOMI: "Seloste kuulutukselle",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "Seloste lähetekirjeeseen",
          },
        },
      },
    };
  });

  beforeEach(() => {
    loadProjektiByOidStub.resolves(projektiAlkutilassa);
    personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
        personSearchFixture.createKayttaja("A2"),
      ])
    );
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  it("luodaan pdf-tiedostoja s3:een", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });

    const luotujenTiedostojenAsiakirjaTyypit = s3Mock.s3Mock
      .calls()
      .map((item) => (item.args?.[0]?.input as any)?.Metadata?.asiakirjatyyppi);
    expect(luotujenTiedostojenAsiakirjaTyypit).to.eql([
      "HYVAKSYMISPAATOSKUULUTUS",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA",
    ]);
  });
});
