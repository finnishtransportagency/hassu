import sinon, { SinonStub } from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import MockDate from "mockdate";
import { DBProjekti, HyvaksymisPaatosVaiheJulkaisu, Kielitiedot, StandardiYhteystiedot, Velho } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { IllegalArgumentError } from "hassu-common/error";
import { hyvaksymisPaatosVaiheTilaManager } from "../../../src/handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import { parameters } from "../../../src/aws/parameters";

describe("hyvaksymisPaatosTilaManager (peru aineistomuokkaus)", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  let deleteFiles: SinonStub;
  let saveProjekti: SinonStub;

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().dbProjektiKaikkiVaiheetSaame();
    delete projekti.jatkoPaatos1Vaihe;
    delete projekti.jatkoPaatos1VaiheJulkaisut;
    delete projekti.jatkoPaatos2Vaihe;
    delete projekti.jatkoPaatos2VaiheJulkaisut;
    userFixture.loginAs(UserFixture.hassuAdmin);
    deleteFiles = sinon.stub(fileService, "deleteProjektiFilesRecursively");
    saveProjekti = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should delete aineistot from hyvaksymispaatos 2 yllapito folder when making peruAineistoMuokkaus", async function () {
    MockDate.set("2022-06-08");
    projekti.hyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      id: (projekti.hyvaksymisPaatosVaihe?.id as number) + 1,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projekti.hyvaksymisPaatosVaiheJulkaisut?.[0]?.hyvaksymisPaiva as string,
      },
    };
    await hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti);
    expect(deleteFiles.getCall(0).args[0].yllapitoFullPath).to.eql("yllapito/tiedostot/projekti/3");
    expect(deleteFiles.getCall(0).args[1]).to.eql("hyvaksymispaatos/2");
  });

  it("should set hyvaksymisPaatosVaihe back to what is was before opening aineistomuokkaus", async function () {
    MockDate.set("2022-06-08");
    projekti.hyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      id: (projekti.hyvaksymisPaatosVaihe?.id as number) + 1,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projekti.hyvaksymisPaatosVaiheJulkaisut?.[0]?.hyvaksymisPaiva as string,
      },
    };
    const {
      yhteystiedot: _yhteystiedot,
      tila: _tila,
      aineistoMuokkaus: _aineistoMuokkaus,
      uudelleenKuulutus: _uudelleenKuulutus,
      ...rest
    } = (projekti.hyvaksymisPaatosVaiheJulkaisut as HyvaksymisPaatosVaiheJulkaisu[])[0];
    const uusiHyvaksymisPaatosVaihe = { ...rest, aineistoMuokkaus: null, uudelleenKuulutus: null };
    await hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti);
    expect(saveProjekti.getCall(0).args[0]).to.eql({
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: uusiHyvaksymisPaatosVaihe,
    });
  });

  it("should reject peruAineistoMuokkaus if there is no open aineistoMuokkaus", async function () {
    MockDate.set("2022-06-08");
    expect(hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkaus ei ole auki. Et voi perua sitä."
    );
  });

  it("should reject peruAineistoMuokkaus if there is no julkaisu", async function () {
    MockDate.set("2022-06-08");
    projekti.hyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      id: (projekti.hyvaksymisPaatosVaihe?.id as number) + 1,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projekti.hyvaksymisPaatosVaiheJulkaisut?.[0]?.hyvaksymisPaiva as string,
      },
    };
    projekti.hyvaksymisPaatosVaiheJulkaisut = [];
    expect(hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkaus täytyy perua tietylle julkaisulle, ja julkaisua ei löytynyt"
    );
  });

  it("should reject peruAineistoMuokkaus if julkaisu tila is ODOTTAA_HYVAKSYNTAA", async function () {
    MockDate.set("2022-06-08");
    projekti.hyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      id: (projekti.hyvaksymisPaatosVaihe?.id as number) + 1,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: projekti.hyvaksymisPaatosVaiheJulkaisut?.[0]?.hyvaksymisPaiva as string,
      },
    };
    projekti.hyvaksymisPaatosVaiheJulkaisut?.push({
      ...projekti.hyvaksymisPaatosVaihe,
      yhteystiedot: [],
      kuulutusYhteystiedot: projekti.hyvaksymisPaatosVaihe.kuulutusYhteystiedot as StandardiYhteystiedot,
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
      velho: projekti.velho as Velho,
      kielitiedot: projekti.kielitiedot as Kielitiedot,
    });
    expect(hyvaksymisPaatosVaiheTilaManager.peruAineistoMuokkaus(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Aineistomuokkausta ei voi perua, jos julkaisu odottaa hyväksyntää. Hylkää julkaisu ensin."
    );
  });
});
