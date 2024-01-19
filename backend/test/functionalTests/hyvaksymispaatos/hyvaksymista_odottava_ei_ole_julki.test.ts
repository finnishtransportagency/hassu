import { api } from "../common/api";
import * as monitoring from "../../../src/aws/monitoring";
import sinon from "sinon";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { ParametersStub } from "../common/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { expect } from "chai";
import { DBProjekti } from "../../../src/database/model";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { hyvaksymisPaatosUudelleenKuulutusOdottaaHyvaksyntaa } from "../testProjektis/hyvaksymisPaatosUudelleenkuulutusOdottaaHyvaksyntaa";
describe("Kun hyväksymispäätöksen uudelleenkuulutus odottaa hyväksyntää", () => {
  let personSearchFixture: PersonSearchFixture;
  let getKayttajasStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;
  new ParametersStub();

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    projektiAlkutilassa = hyvaksymisPaatosUudelleenKuulutusOdottaaHyvaksyntaa;
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

  it("julkisella puolella ei näy hyväkymistä odottava julkaisu", async () => {
    const julkinenProjekti = await api.lataaProjektiJulkinen(projektiAlkutilassa.oid);
    expect(julkinenProjekti.hyvaksymisPaatosVaihe?.uudelleenKuulutus).does.not.exist;
  });
});
