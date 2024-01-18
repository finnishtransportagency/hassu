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

describe("Kun hyväksymispäätöksen uudelleenkuulutuksen avaa", () => {
  let saveProjektiStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let fileServiceCopyYllapitoFolderStub: sinon.SinonStub;
  let updateJulkaisutStub: sinon.SinonStub;
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;

  new ParametersStub();

  new S3Mock(true);
  before(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    projektiAlkutilassa = hyvaksymisPaatosDone;

    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    fileServiceCopyYllapitoFolderStub = sinon.stub(fileService, "copyYllapitoFolder");
    updateJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "update");
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

  it("viimeisimmän hyväksymispäätöksen tiedostot kopioidaan uuteen kansioon", async () => {
    userFixture.loginAsAdmin();
    await api.siirraTila({
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
    });
    const copyFilesArgs = fileServiceCopyYllapitoFolderStub.firstCall?.args;
    expect(copyFilesArgs).to.exist;
    const expectedCopyFilesArgs = [
      {
        parent: { oid: "1.2.246.578.5.1.2978288874.2711575506", parent: undefined },
        folder: "hyvaksymispaatos",
        id: 2,
      },
      {
        parent: { oid: "1.2.246.578.5.1.2978288874.2711575506", parent: undefined },
        folder: "hyvaksymispaatos",
        id: 3,
      },
    ];
    expect(copyFilesArgs).to.eql(expectedCopyFilesArgs);
  });

  it("hyvaksymisPaatosVaihe asetetaan tietokannassa uudelleenkuulutus-tilaan, sen id:tä kasvatetaan ja sen aineistopolut korjataan", async () => {
    userFixture.loginAsAdmin();
    await api.siirraTila({
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
    });
    const saveProjektiArgs = saveProjektiStub.firstCall?.args?.[0];
    expect(saveProjektiArgs).to.exist;
    const aineistoNahtavilla = [
      {
        tiedosto: "/hyvaksymispaatos/3/aineisto3.txt",
        dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
        jarjestys: 1,
        kategoriaId: "osa_a",
        nimi: "aineisto3.txt",
        tila: API.AineistoTila.VALMIS,
        tuotu: "2025-01-01T00:00:01+02:00",
        uuid: "00000002-e436-4256-a2d2-74ab6778d07f1.20",
      },
      {
        tiedosto: "/hyvaksymispaatos/3/1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
        dokumenttiOid: "1.2.246.578.5.100.2698246895.2362169760",
        jarjestys: 1,
        kategoriaId: "osa_a",
        nimi: "1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
        tila: API.AineistoTila.VALMIS,
        tuotu: "2025-01-01T00:00:01+02:00",
        uuid: "00000005-e436-4256-a2d2-74ab6778d07f1.20uusi",
      },
    ];
    const hyvaksymisPaatos = [
      {
        dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
        jarjestys: 1,
        nimi: "aineisto3.txt",
        tiedosto: "/hyvaksymispaatos/3/paatos/aineisto3.txt",
        tila: API.AineistoTila.VALMIS,
        tuotu: "2025-01-01T00:00:01+02:00",
        uuid: "00000001-e436-4256-a2d2-74ab6778d07f1.20",
      },
    ];
    const uudelleenKuulutus = { tila: API.UudelleenkuulutusTila.PERUUTETTU };
    expect(saveProjektiArgs?.hyvaksymisPaatosVaihe).to.eql({
      ...projektiAlkutilassa.hyvaksymisPaatosVaihe,
      id: 3,
      uudelleenKuulutus,
      aineistoNahtavilla,
      hyvaksymisPaatos,
      hyvaksymisPaatosVaiheSaamePDFt: undefined,
    });
  });

  it("viimeisimmän hyväksymispäätösvaiheen tila asetetaan peruutetuksi", async () => {
    userFixture.loginAsAdmin();
    await api.siirraTila({
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
    });
    const updateJulkaisuArgsProjekti = updateJulkaisutStub.firstCall?.args?.[0];
    const updateJulkaisuArgsJulkaisu = updateJulkaisutStub.firstCall?.args?.[1];
    expect(updateJulkaisuArgsProjekti).to.exist;
    expect(updateJulkaisuArgsJulkaisu).to.exist;
    const julkaisujenMaaraAlussa: number = projektiAlkutilassa.hyvaksymisPaatosVaiheJulkaisut?.length ?? 0;
    expect(updateJulkaisuArgsProjekti?.hyvaksymisPaatosVaiheJulkaisut?.length).to.eql(julkaisujenMaaraAlussa);
    expect(updateJulkaisuArgsJulkaisu).to.eql({
      ...projektiAlkutilassa.hyvaksymisPaatosVaiheJulkaisut?.[julkaisujenMaaraAlussa - 1],
      tila: API.KuulutusJulkaisuTila.PERUUTETTU,
    });
  });
});
