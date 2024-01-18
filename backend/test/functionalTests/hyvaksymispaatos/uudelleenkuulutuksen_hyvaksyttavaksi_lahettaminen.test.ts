import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { api } from "../common/api";
import { hyvaksymisPaatosDone } from "../testProjektis/hyvaksymisPaatosDone";
import * as monitoring from "../../../src/aws/monitoring";
import sinon from "sinon";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { ParametersStub } from "../common/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";
import { expect } from "chai";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../src/database/model";
import { adaptHyvaksymisPaatosVaiheToInput } from "hassu-common/util/adaptDBtoInput";
import { assertIsDefined } from "../../../src/util/assertions";
describe("Kun hyväksymispäätöksen uudelleenkuulutuksen lähettää hyväksyttäväksi", () => {
  let saveProjektiStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let fileServiceCopyYllapitoFolderStub: sinon.SinonStub;
  let updateJulkaisutStub: sinon.SinonStub;
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;
  let projektiInput: API.TallennaProjektiInput;
  let s3MockSpy = sinon.spy();
  new ParametersStub();
  new S3Mock(true).s3Mock.callsFake(s3MockSpy);

  before(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    projektiAlkutilassa = hyvaksymisPaatosDone;

    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    fileServiceCopyYllapitoFolderStub = sinon.stub(fileService, "copyYllapitoFolder");
    updateJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "update");
    assertIsDefined(projektiAlkutilassa.hyvaksymisPaatosVaihe, "projektiAlkutilassa.hyvaksymisPaatosVaihe on määritelty");
    projektiInput = {
      oid: projektiAlkutilassa.oid,
      versio: projektiAlkutilassa.versio,
      hyvaksymisPaatosVaihe: {
        ...adaptHyvaksymisPaatosVaiheToInput(projektiAlkutilassa.hyvaksymisPaatosVaihe),
        hyvaksymisPaatos: undefined,
        aineistoNahtavilla: undefined,
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
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  it.only("luo pdf-tiedostoja s3:een", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });
    console.log();
    console.log(s3MockSpy.args);
    console.log();
  });
});
