/* tslint:disable:only-arrow-functions */

import { aloitusKuulutusTilaManager } from "../../../src/handler/tila/aloitusKuulutusTilaManager";
import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { IllegalArgumentError } from "hassu-common/error";
import { DBProjekti } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { dateToString, nyt } from "../../../src/util/dateUtil";
import { UudelleenkuulutusTila } from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";
import { expect } from "chai";
import { SchedulerMock } from "../../../integrationtest/api/testUtil/util";
import { parameters } from "../../../src/aws/parameters";

describe("aloitusKuulutusTilaManager", () => {
  let saveProjektiStub: sinon.SinonStub;
  let _updateJulkaisuStub: sinon.SinonStub;
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();
  before(() => {
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    _updateJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  beforeEach(() => {
    new SchedulerMock();
    const projekti4 = new ProjektiFixture().dbProjekti4();
    const { oid, versio, kayttoOikeudet, euRahoitus, vahainenMenettely, kielitiedot, velho, aloitusKuulutus, aloitusKuulutusJulkaisut } =
      projekti4;
    projekti = {
      oid,
      versio,
      kayttoOikeudet,
      euRahoitus,
      vahainenMenettely,
      kielitiedot,
      velho,
      aloitusKuulutus,
      aloitusKuulutusJulkaisut,
      tallennettu: true,
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should reject uudelleenkuulutus succesfully", async function () {
    projekti.aloitusKuulutusJulkaisut = undefined;
    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa"
    );

    projekti.aloitusKuulutus = undefined;
    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(projekti)).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektilla ei ole aloituskuulutusta"
    );

    await expect(aloitusKuulutusTilaManager.uudelleenkuuluta(new ProjektiFixture().dbProjekti4())).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Et voi uudelleenkuuluttaa aloistuskuulutusta projektin ollessa tässä tilassa:NAHTAVILLAOLO"
    );
  });

  it("should create uudelleenkuulutus succesfully for unpublished kuulutus", async function () {
    projekti.aloitusKuulutusJulkaisut![0].kuulutusPaiva = dateToString(nyt().add(1, "day")); // Tomorrow
    await aloitusKuulutusTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.aloitusKuulutus?.uudelleenKuulutus).to.eql({ tila: UudelleenkuulutusTila.PERUUTETTU });
  });

  it("should create uudelleenkuulutus succesfully for published kuulutus when project uses vähäinenMenettely", async function () {
    const projekti = new ProjektiFixture().dbProjekti4();
    projekti.aloitusKuulutusJulkaisut![0].kuulutusPaiva = dateToString(nyt().add(-1, "day")); // Yesterday
    delete projekti.vuorovaikutusKierros;
    delete projekti.vuorovaikutusKierrosJulkaisut;
    delete projekti.nahtavillaoloVaihe;
    delete projekti.nahtavillaoloVaiheJulkaisut;
    delete projekti.hyvaksymisPaatosVaiheJulkaisut;
    await aloitusKuulutusTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.aloitusKuulutus?.uudelleenKuulutus).to.eql({
      tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      alkuperainenHyvaksymisPaiva: "2022-03-21",
    });
  });

  it("should create uudelleenkuulutus succesfully for published kuulutus", async function () {
    projekti.aloitusKuulutusJulkaisut![0].kuulutusPaiva = dateToString(nyt().add(-1, "day")); // Yesterday
    await aloitusKuulutusTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjektiStub.getCall(0).firstArg;
    expect(savedProjekti.aloitusKuulutus?.uudelleenKuulutus).to.eql({
      tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      alkuperainenHyvaksymisPaiva: "2022-03-21",
    });
  });
});
